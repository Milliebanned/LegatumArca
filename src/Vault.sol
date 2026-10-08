// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Implemented by VaultFactory: lets a vault it created report
///      beneficiaries added after creation.
interface IVaultRegistry {
    function registerBeneficiaries(address[] calldata beneficiaries) external;
}

/// @title Vault
/// @notice Non-custodial USDC dead-man's-switch vault. One owner, up to
///         MAX_BENEFICIARIES beneficiaries, each entitled to a percentage (in
///         basis points) of the balance once the owner stops checking in. When
///         the timer runs out, distribute() sends every share straight to the
///         beneficiaries' wallets; nobody has to claim. The owner can change the
///         beneficiary list while the vault is active.
///         Deployed once as an implementation contract and reused via minimal
///         proxy clones (see VaultFactory). Arc mainnet only — no chain abstraction.
contract Vault is ReentrancyGuard {
    enum State {
        Active, // owner is checking in
        // Deadline passed; waiting for distribute(). Never stored: a lapsed
        // vault stays Active in storage (so nobody but the owner can change
        // what the owner may do with it) and getVaultState() reports Due.
        Due,
        Distributed, // shares sent to beneficiaries
        Cancelled // owner took the funds back
    }

    // One on-chain history entry per owner/beneficiary action, so a frontend
    // can show a vault's activity without an indexer or archive-node log
    // queries (Arc's public RPC prunes old logs and caps getLogs ranges).
    enum Action {
        Created, // amount = 0
        BeneficiariesSet, // amount = number of beneficiaries
        Deposit, // amount = USDC deposited
        Withdraw, // amount = USDC withdrawn
        CheckIn, // amount = 0
        Payout, // amount = USDC sent to beneficiary `actor`
        PayoutFailed, // amount = USDC held for `actor` after their transfer failed
        Cancel // amount = USDC returned to the owner
    }

    struct HistoryEntry {
        Action action;
        uint64 timestamp;
        address actor;
        uint256 amount;
    }

    // Arc mainnet chain ID. Never configurable, never overridden.
    uint256 public constant CHAIN_ID = 5042;

    uint256 public constant MAX_BENEFICIARIES = 10;
    uint256 public constant TOTAL_SHARES = 10_000; // basis points: 10_000 = 100%
    uint256 public constant MAX_NAME_LENGTH = 64; // bytes
    // Upper bounds on the timer. Beyond being sane, they keep
    // lastCheckInTime + interval + grace far from overflow, so deadlineTime()
    // and every view built on it can never revert.
    uint256 public constant MAX_CHECK_IN_INTERVAL = 3650 days;
    // Lower bound on the timer. A window of seconds would hand a vault to its
    // beneficiaries almost as soon as it was funded, and would let anyone
    // mass-produce instantly-due vaults for payout keepers to waste gas on.
    uint256 public constant MIN_CHECK_IN_INTERVAL = 1 days;
    uint256 public constant MAX_GRACE_PERIOD = 365 days;

    // USDC token address on Arc mainnet. Fixed at implementation deployment
    // (by the factory constructor) and shared by every clone via delegatecall —
    // there is no per-vault override and no way to change it after deployment.
    address public immutable USDC;

    // The factory that cloned this vault. Told about beneficiaries added
    // later so its by-beneficiary index stays complete.
    address public factory;

    address public owner;
    string public name;
    uint256 public checkInInterval;
    uint256 public gracePeriod;
    uint256 public lastCheckInTime;
    State public state;
    bool public initialized;

    address[] internal beneficiaryList;
    mapping(address => uint256) public shareOf; // basis points; 0 = not a beneficiary

    // Balance at the moment of distribution, split by share.
    uint256 public distributedPool;
    // A share whose transfer failed during distribute() (e.g. a USDC-blacklisted
    // address) is held here for that beneficiary to withdraw later, so one bad
    // address can't block everyone else's payout.
    mapping(address => uint256) public owed;

    HistoryEntry[] internal history;

    event Initialized(
        address indexed owner,
        string name,
        address[] beneficiaries,
        uint256[] shares,
        uint256 checkInInterval,
        uint256 gracePeriod
    );
    event CheckedIn(address indexed owner, uint256 newDeadline);
    event Deposited(address indexed owner, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event Distributed(uint256 pool, address indexed caller);
    event Paid(address indexed beneficiary, uint256 amount);
    event PayoutFailed(address indexed beneficiary, uint256 amount);
    event OwedWithdrawn(address indexed beneficiary, uint256 amount);
    event Cancelled(address indexed owner);
    event BeneficiariesUpdated(address[] beneficiaries, uint256[] shares);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyActive() {
        require(state == State.Active, "Vault not active");
        _;
    }

    /// @param usdc The USDC token address on Arc mainnet. Set once, at
    ///        implementation deployment, by VaultFactory's constructor.
    constructor(address usdc) {
        require(usdc != address(0), "Invalid USDC address");
        uint256 id;
        assembly {
            id := chainid()
        }
        require(id == CHAIN_ID, "Arc mainnet only");

        USDC = usdc;

        // Lock the implementation contract itself so initialize() can never be
        // called directly on it — only on clones, which start uninitialized.
        initialized = true;
    }

    /// @dev Initialize a clone (called once by the factory right after cloning).
    /// @param _shares Basis points per beneficiary, same order as _beneficiaries.
    ///        Each must be > 0 and together they must sum to TOTAL_SHARES.
    function initialize(
        address _owner,
        string calldata _name,
        address[] calldata _beneficiaries,
        uint256[] calldata _shares,
        uint256 _checkInInterval,
        uint256 _gracePeriod
    ) external {
        require(!initialized, "Already initialized");
        require(_owner != address(0), "Invalid owner");
        require(bytes(_name).length <= MAX_NAME_LENGTH, "Name too long");
        require(_checkInInterval >= MIN_CHECK_IN_INTERVAL, "Interval too short");
        require(_checkInInterval <= MAX_CHECK_IN_INTERVAL, "Interval too long");
        require(_gracePeriod <= MAX_GRACE_PERIOD, "Grace period too long");

        owner = _owner;
        factory = msg.sender;
        _record(Action.Created, _owner, 0);
        _setBeneficiaries(_owner, _beneficiaries, _shares);

        name = _name;
        checkInInterval = _checkInInterval;
        gracePeriod = _gracePeriod;
        lastCheckInTime = block.timestamp;
        state = State.Active;
        initialized = true;

        emit Initialized(_owner, _name, _beneficiaries, _shares, _checkInInterval, _gracePeriod);
    }

    /// @dev Deposit USDC into the vault. Owner must approve this vault first.
    function deposit(uint256 amount) external onlyOwner onlyActive nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        _record(Action.Deposit, msg.sender, amount);
        emit Deposited(owner, amount);
    }

    /// @dev Owner replaces the whole beneficiary list (add, remove, or
    ///      re-weight people) while the vault is active. Same rules as at
    ///      creation. Not possible once the vault is distributed or cancelled.
    function setBeneficiaries(
        address[] calldata _beneficiaries,
        uint256[] calldata _shares
    ) external onlyOwner onlyActive nonReentrant {
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            shareOf[beneficiaryList[i]] = 0;
        }
        delete beneficiaryList;
        _setBeneficiaries(owner, _beneficiaries, _shares);
        IVaultRegistry(factory).registerBeneficiaries(_beneficiaries);
    }

    function _setBeneficiaries(
        address _owner,
        address[] calldata _beneficiaries,
        uint256[] calldata _shares
    ) internal {
        require(
            _beneficiaries.length > 0 && _beneficiaries.length <= MAX_BENEFICIARIES,
            "1 to 10 beneficiaries"
        );
        require(_beneficiaries.length == _shares.length, "Shares length mismatch");

        uint256 total;
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            address b = _beneficiaries[i];
            // A share sent to this vault, the token or the factory could never
            // be moved again.
            require(
                b != address(0) && b != address(this) && b != USDC && b != factory,
                "Invalid beneficiary"
            );
            require(b != _owner, "Beneficiary cannot be owner");
            require(shareOf[b] == 0, "Duplicate beneficiary");
            require(_shares[i] > 0, "Share must be > 0");
            shareOf[b] = _shares[i];
            beneficiaryList.push(b);
            total += _shares[i];
        }
        require(total == TOTAL_SHARES, "Shares must total 100%");

        _record(Action.BeneficiariesSet, _owner, _beneficiaries.length);
        emit BeneficiariesUpdated(_beneficiaries, _shares);
    }

    function _record(Action action, address actor, uint256 amount) internal {
        history.push(HistoryEntry(action, uint64(block.timestamp), actor, amount));
    }

    /// @dev Owner checks in to prove they're still active and reset the deadline.
    ///      Works after the deadline too, as long as the vault hasn't been
    ///      distributed yet.
    function checkIn() external onlyOwner onlyActive nonReentrant {
        lastCheckInTime = block.timestamp;
        _record(Action.CheckIn, msg.sender, 0);
        emit CheckedIn(owner, block.timestamp + checkInInterval + gracePeriod);
    }

    /// @dev Deadline after which the vault can be distributed.
    function deadlineTime() public view returns (uint256) {
        return lastCheckInTime + checkInInterval + gracePeriod;
    }

    /// @dev True once the deadline has passed and the vault hasn't been
    ///      distributed or cancelled — i.e. distribute() would succeed. What
    ///      an automated keeper polls.
    function isDue() public view returns (bool) {
        return state == State.Active && block.timestamp > deadlineTime();
    }

    /// @dev Sends every beneficiary their share straight to their wallet once
    ///      the deadline has passed. Callable by anyone — normally an automated
    ///      keeper the moment the timer runs out, but a beneficiary or anyone
    ///      else can call it too, so payout never depends on one service. The
    ///      last beneficiary's share absorbs rounding dust. A transfer that
    ///      fails is recorded in `owed` for withdrawOwed() instead of reverting
    ///      the whole payout.
    function distribute() external nonReentrant {
        require(isDue(), "Not due yet");

        // effects before interactions
        state = State.Distributed;
        uint256 pool = IERC20(USDC).balanceOf(address(this));
        distributedPool = pool;
        emit Distributed(pool, msg.sender);

        uint256 n = beneficiaryList.length;
        uint256 allocated;
        for (uint256 i = 0; i < n; i++) {
            address b = beneficiaryList[i];
            uint256 amount = i == n - 1 ? pool - allocated : (pool * shareOf[b]) / TOTAL_SHARES;
            allocated += amount;
            if (amount == 0) continue;

            if (_tryTransfer(b, amount)) {
                _record(Action.Payout, b, amount);
                emit Paid(b, amount);
            } else {
                owed[b] += amount;
                _record(Action.PayoutFailed, b, amount);
                emit PayoutFailed(b, amount);
            }
        }
    }

    /// @dev A beneficiary whose transfer failed during distribute() retries
    ///      it here, once whatever blocked it is resolved.
    function withdrawOwed() external nonReentrant {
        uint256 amount = owed[msg.sender];
        require(amount > 0, "Nothing owed");
        owed[msg.sender] = 0;
        _record(Action.Payout, msg.sender, amount);
        require(IERC20(USDC).transfer(msg.sender, amount), "Transfer failed");
        emit OwedWithdrawn(msg.sender, amount);
    }

    // USDC transfer that reports failure instead of reverting (a revert, a
    // false or malformed return, or a non-contract token all count as
    // failure). A caller can't fake a failure by starving the call of gas:
    // the 1/64 of gas the EVM holds back is far less than recording a failed
    // payout costs, so a starved transfer takes the whole call down with it.
    function _tryTransfer(address to, uint256 amount) internal returns (bool) {
        (bool ok, bytes memory ret) = USDC.call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok) return false;
        if (ret.length == 0) return USDC.code.length > 0;
        return ret.length == 32 && uint256(bytes32(ret)) == 1;
    }

    /// @dev Owner withdraws part of the balance while the vault is active.
    function withdraw(uint256 amount) external onlyOwner onlyActive nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDC).balanceOf(address(this)) >= amount, "Insufficient balance");
        _record(Action.Withdraw, msg.sender, amount);
        require(IERC20(USDC).transfer(owner, amount), "Transfer failed");
        emit Withdrawn(owner, amount);
    }

    /// @dev Owner cancels the vault and withdraws everything. Terminal state.
    function cancel() external onlyOwner onlyActive nonReentrant {
        state = State.Cancelled;
        uint256 amount = IERC20(USDC).balanceOf(address(this));
        _record(Action.Cancel, msg.sender, amount);
        if (amount > 0) {
            require(IERC20(USDC).transfer(owner, amount), "Transfer failed");
        }
        emit Cancelled(owner);
    }

    /// @dev Every beneficiary and their share in basis points, in creation order.
    function getBeneficiaries()
        external
        view
        returns (address[] memory beneficiaries, uint256[] memory shares)
    {
        beneficiaries = beneficiaryList;
        shares = new uint256[](beneficiaries.length);
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            shares[i] = shareOf[beneficiaries[i]];
        }
    }

    /// @dev Number of history entries.
    function historyLength() external view returns (uint256) {
        return history.length;
    }

    /// @dev History entries [from, from + count), oldest first, clamped to the end.
    function getHistory(uint256 from, uint256 count) external view returns (HistoryEntry[] memory entries) {
        uint256 end = from + count;
        if (end > history.length) end = history.length;
        if (from >= end) return new HistoryEntry[](0);
        entries = new HistoryEntry[](end - from);
        for (uint256 i = from; i < end; i++) {
            entries[i - from] = history[i];
        }
    }

    /// @dev Number of beneficiaries.
    function beneficiaryCount() external view returns (uint256) {
        return beneficiaryList.length;
    }

    /// @dev What `who` gets from this vault right now: their share of the
    ///      current balance before distribution, what they're owed after it.
    function shareValue(address who) external view returns (uint256) {
        if (state == State.Distributed || state == State.Cancelled) return owed[who];
        return (IERC20(USDC).balanceOf(address(this)) * shareOf[who]) / TOTAL_SHARES;
    }

    /// @dev Current USDC balance held by the vault.
    function balance() external view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }

    /// @dev Seconds remaining until the deadline. 0 if already past.
    function timeUntilDeadline() external view returns (uint256) {
        uint256 deadline = deadlineTime();
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }

    /// @dev Current vault state, recomputed as of now (does not write storage).
    ///      Useful for frontends that want the live state without sending a tx.
    function getVaultState() external view returns (State) {
        if (state == State.Active && block.timestamp > deadlineTime()) {
            return State.Due;
        }
        return state;
    }
}
