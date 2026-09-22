// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Vault
/// @notice Non-custodial USDC dead-man's-switch vault. One owner, one beneficiary.
///         Deployed once as an implementation contract and reused via minimal proxy
///         clones (see VaultFactory). Arc mainnet only — no chain abstraction.
contract Vault is ReentrancyGuard {
    enum State {
        Active,
        Claimable,
        Claimed,
        Cancelled
    }

    // Arc mainnet chain ID. Never configurable, never overridden.
    uint256 public constant CHAIN_ID = 1329;

    // USDC token address on Arc mainnet. Fixed at implementation deployment
    // (by the factory constructor) and shared by every clone via delegatecall —
    // there is no per-vault override and no way to change it after deployment.
    address public immutable USDC;

    address public owner;
    address public beneficiary;
    uint256 public checkInInterval;
    uint256 public gracePeriod;
    uint256 public lastCheckInTime;
    State public state;
    bool public initialized;

    event Initialized(
        address indexed owner,
        address indexed beneficiary,
        uint256 checkInInterval,
        uint256 gracePeriod
    );
    event CheckedIn(address indexed owner, uint256 newDeadline);
    event Deposited(address indexed owner, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event Claimed(address indexed beneficiary, uint256 amount);
    event Cancelled(address indexed owner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "Only beneficiary");
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
    function initialize(
        address _owner,
        address _beneficiary,
        uint256 _checkInInterval,
        uint256 _gracePeriod
    ) external {
        require(!initialized, "Already initialized");
        require(_owner != address(0), "Invalid owner");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_beneficiary != _owner, "Beneficiary cannot be owner");
        require(_checkInInterval > 0, "Interval must be > 0");

        owner = _owner;
        beneficiary = _beneficiary;
        checkInInterval = _checkInInterval;
        gracePeriod = _gracePeriod;
        lastCheckInTime = block.timestamp;
        state = State.Active;
        initialized = true;

        emit Initialized(_owner, _beneficiary, _checkInInterval, _gracePeriod);
    }

    /// @dev Deposit USDC into the vault. Owner must approve this vault first.
    function deposit(uint256 amount) external onlyOwner onlyActive nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit Deposited(owner, amount);
    }

    /// @dev Owner checks in to prove they're still active and reset the deadline.
    ///      Also pulls the vault back from CLAIMABLE to ACTIVE if it had lapsed.
    function checkIn() external onlyOwner nonReentrant {
        require(state == State.Active || state == State.Claimable, "Vault not active");
        lastCheckInTime = block.timestamp;
        if (state == State.Claimable) {
            state = State.Active;
        }
        emit CheckedIn(owner, block.timestamp + checkInInterval + gracePeriod);
    }

    /// @dev Deadline after which the beneficiary becomes eligible to claim.
    function deadlineTime() public view returns (uint256) {
        return lastCheckInTime + checkInInterval + gracePeriod;
    }

    /// @dev Transition ACTIVE -> CLAIMABLE if the deadline has passed. Callable
    ///      by anyone; purely a bookkeeping convenience, no funds move here.
    function updateState() public {
        if (state == State.Active && block.timestamp > deadlineTime()) {
            state = State.Claimable;
        }
    }

    /// @dev Beneficiary claims the full USDC balance once the deadline has passed.
    function claim() external onlyBeneficiary nonReentrant {
        updateState();
        require(state == State.Claimable, "Vault not claimable yet");

        // effects before interactions
        state = State.Claimed;
        uint256 amount = IERC20(USDC).balanceOf(address(this));
        require(amount > 0, "No funds to claim");

        // interaction
        require(IERC20(USDC).transfer(beneficiary, amount), "Transfer failed");

        emit Claimed(beneficiary, amount);
    }

    /// @dev Owner withdraws part of the balance while the vault is active.
    function withdraw(uint256 amount) external onlyOwner onlyActive nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDC).balanceOf(address(this)) >= amount, "Insufficient balance");
        require(IERC20(USDC).transfer(owner, amount), "Transfer failed");
        emit Withdrawn(owner, amount);
    }

    /// @dev Owner cancels the vault and withdraws everything. Terminal state.
    function cancel() external onlyOwner onlyActive nonReentrant {
        state = State.Cancelled;
        uint256 amount = IERC20(USDC).balanceOf(address(this));
        if (amount > 0) {
            require(IERC20(USDC).transfer(owner, amount), "Transfer failed");
        }
        emit Cancelled(owner);
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
            return State.Claimable;
        }
        return state;
    }
}
