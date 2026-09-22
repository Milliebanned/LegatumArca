# Design: Continuity

## Arc Mainnet Only

**All code in this section is hardcoded for Arc mainnet (chain ID 5042). There is no chain abstraction, no multi-chain support, and no fallback chains.** Every constant, address, and configuration is Arc-specific.

---

## Smart Contract Interfaces

### VaultFactory.sol

```solidity
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Vault.sol";

contract VaultFactory {
    
    // Arc Mainnet Constants (hardcoded, no chain abstraction)
    uint256 public constant CHAIN_ID = 5042;
    
    address public vaultImplementation;
    mapping(address => address) public vaults; // owner → vault address
    address[] public allVaults;

    event VaultCreated(
        address indexed owner,
        address indexed vault,
        address beneficiary,
        uint256 checkInInterval,
        uint256 gracePeriod
    );

    constructor() {
        // Verify we're on Arc mainnet
        uint256 chainId;
        assembly { chainId := chainid() }
        require(chainId == CHAIN_ID, "This contract only deploys on Arc mainnet (5042)");
        
        vaultImplementation = address(new Vault());
    }

    /// @dev Creates a new vault for the caller.
    /// @param beneficiary Address that can claim funds if owner is inactive.
    /// @param checkInInterval Seconds between required check-ins.
    /// @param gracePeriod Additional seconds before beneficiary can claim.
    function createVault(
        address beneficiary,
        uint256 checkInInterval,
        uint256 gracePeriod
    ) external returns (address) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(checkInInterval > 0, "Interval must be > 0");
        require(vaults[msg.sender] == address(0), "One vault per owner");

        // Clone implementation
        address vault = Clones.clone(vaultImplementation);
        Vault(vault).initialize(msg.sender, beneficiary, checkInInterval, gracePeriod);

        vaults[msg.sender] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault, beneficiary, checkInInterval, gracePeriod);
        return vault;
    }

    /// @dev Returns total number of vaults created.
    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    /// @dev Returns list of all vault addresses.
    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }
}
```

### Vault.sol

```solidity
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Vault is ReentrancyGuard {

    enum State { Active, Claimable, Claimed, Cancelled }

    // Arc Mainnet Constants (hardcoded, no chain abstraction)
    address public constant USDC = 0x3600000000000000000000000000000000000000; // Arc mainnet USDC (verified, docs.arc.io)
    uint256 public constant CHAIN_ID = 5042; // Arc mainnet chain ID

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

    modifier onlyClaimable() {
        require(state == State.Claimable, "Vault not claimable");
        _;
    }

    /// @dev Initialize vault (called by factory).
    function initialize(
        address _owner,
        address _beneficiary,
        uint256 _checkInInterval,
        uint256 _gracePeriod
    ) external {
        require(!initialized, "Already initialized");
        require(_owner != address(0), "Invalid owner");
        require(_beneficiary != address(0), "Invalid beneficiary");
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

    /// @dev Deposit USDC into vault. Owner must approve first.
    function deposit(uint256 amount) external onlyOwner onlyActive nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit Deposited(owner, amount);
    }

    /// @dev Owner checks in to prove still active and reset deadline.
    function checkIn() external onlyOwner nonReentrant {
        lastCheckInTime = block.timestamp;
        if (state == State.Claimable) {
            state = State.Active; // Return to active if was claimable
        }
        emit CheckedIn(owner, block.timestamp + checkInInterval);
    }

    /// @dev Compute deadline (when beneficiary can claim).
    function deadlineTime() public view returns (uint256) {
        return lastCheckInTime + checkInInterval + gracePeriod;
    }

    /// @dev Check if vault is now past deadline and update state if so.
    function updateState() public {
        if (state == State.Active && block.timestamp > deadlineTime()) {
            state = State.Claimable;
        }
    }

    /// @dev Beneficiary claims funds if deadline has passed.
    function claim() external onlyBeneficiary nonReentrant {
        updateState();
        require(state == State.Claimable, "Vault not claimable yet");

        state = State.Claimed;
        uint256 balance = IERC20(USDC).balanceOf(address(this));
        require(balance > 0, "No funds to claim");
        require(IERC20(USDC).transfer(beneficiary, balance), "Transfer failed");

        emit Claimed(beneficiary, balance);
    }

    /// @dev Owner withdraws funds while active.
    function withdraw(uint256 amount) external onlyOwner onlyActive nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(
            IERC20(USDC).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        require(IERC20(USDC).transfer(owner, amount), "Transfer failed");
        emit Withdrawn(owner, amount);
    }

    /// @dev Owner cancels vault and withdraws all funds.
    function cancel() external onlyOwner onlyActive nonReentrant {
        state = State.Cancelled;
        uint256 balance = IERC20(USDC).balanceOf(address(this));
        if (balance > 0) {
            require(IERC20(USDC).transfer(owner, balance), "Transfer failed");
        }
        emit Cancelled(owner);
    }

    /// @dev Get current vault balance.
    function balance() external view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }

    /// @dev Get time until deadline (in seconds). Returns 0 if already past deadline.
    function timeUntilDeadline() external view returns (uint256) {
        uint256 deadline = deadlineTime();
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }
}
```

## State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            ACTIVE                                    │
│                                                                      │
│  └─ lastCheckInTime = now                                            │
│  └─ owner can: checkIn(), withdraw(amount), cancel(), deposit()     │
│  └─ beneficiary cannot: claim()                                      │
│                                                                      │
│                   ▼ (block.timestamp > deadlineTime())               │
│                   │                                                  │
│                   ▼                                                  │
│            ┌──────────────────┐                                      │
│            │    CLAIMABLE     │                                      │
│            │                  │                                      │
│            │ - beneficiary can│                                      │
│            │   call claim()   │                                      │
│            │ - owner can still│                                      │
│            │   call checkIn() │                                      │
│            │   (returns to    │                                      │
│            │    ACTIVE)       │                                      │
│            │                  │                                      │
│            │    ▼ (claim())   │                                      │
│            │                  │                                      │
│            └──────────────────┘                                      │
│                   │                                                  │
│                   ▼                                                  │
│            ┌──────────────────┐                                      │
│            │    CLAIMED       │                                      │
│            │ (terminal)       │                                      │
│            │ - funds sent to  │                                      │
│            │   beneficiary    │                                      │
│            │ - no further     │                                      │
│            │   actions        │                                      │
│            └──────────────────┘                                      │
│                                                                      │
│  Also from ACTIVE: cancel() → CANCELLED (terminal)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Edge Cases & Handling

### Case 1: Owner Checks In Seconds Before Deadline

**Scenario:** Deadline is at block 1000. Owner calls `checkIn()` at block 999.

**Expected Behavior:**
- `lastCheckInTime` updated to block.timestamp (999).
- New deadline = 999 + checkInInterval + gracePeriod.
- Beneficiary cannot yet claim.

**Implementation:**
```solidity
function checkIn() external onlyOwner nonReentrant {
    lastCheckInTime = block.timestamp; // Always update
    if (state == State.Claimable) {
        state = State.Active;
    }
}
```

### Case 2: Owner Returns After Deadline But Before Claim

**Scenario:** Deadline passed. Vault is in CLAIMABLE state. Owner calls `checkIn()`.

**Expected Behavior:**
- Vault transitions from CLAIMABLE → ACTIVE.
- New deadline is set.
- Beneficiary loses ability to claim.

**Implementation:**
```solidity
function checkIn() external onlyOwner nonReentrant {
    lastCheckInTime = block.timestamp;
    if (state == State.Claimable) {
        state = State.Active; // Back to active
    }
}
```

### Case 3: Beneficiary Tries to Claim Before Deadline

**Scenario:** Deadline is at block 2000. Beneficiary calls `claim()` at block 1999.

**Expected Behavior:**
- `updateState()` is called; deadline not yet passed, so state remains ACTIVE.
- `claim()` reverts with "Vault not claimable yet".

**Implementation:**
```solidity
function claim() external onlyBeneficiary nonReentrant {
    updateState();
    require(state == State.Claimable, "Vault not claimable yet");
    // ... rest of claim logic
}
```

### Case 4: Owner Withdraws Entire Balance, Then Tries to Claim

**Scenario:** Owner deposits 100 USDC, then withdraws 100 USDC. Deadline passes. Beneficiary calls `claim()`.

**Expected Behavior:**
- Beneficiary can call `claim()`, but vault has 0 USDC.
- Transfer of 0 USDC should succeed (no-op on most ERC20 implementations).
- Alternatively, revert if balance is 0 (see implementation below).

**Implementation:**
```solidity
function claim() external onlyBeneficiary nonReentrant {
    updateState();
    require(state == State.Claimable, "Vault not claimable yet");

    state = State.Claimed;
    uint256 balance = IERC20(USDC).balanceOf(address(this));
    require(balance > 0, "No funds to claim"); // Revert if empty
    require(IERC20(USDC).transfer(beneficiary, balance), "Transfer failed");

    emit Claimed(beneficiary, balance);
}
```

### Case 5: Reentrancy on Claim

**Scenario:** Beneficiary's address is a contract with a receive hook that calls back into `claim()`.

**Expected Behavior:**
- First call to `claim()` updates state to CLAIMED.
- Reentrancy attempt fails because `require(state == State.Claimable)` now fails (state is CLAIMED).

**Implementation:**
```solidity
function claim() external onlyBeneficiary nonReentrant {
    updateState();
    require(state == State.Claimable, "Vault not claimable yet");

    state = State.Claimed; // Set BEFORE transfer (checks-effects-interactions)
    // ... transfer logic
}
```

Additionally, `ReentrancyGuard` from OpenZeppelin provides defense in depth via a mutex lock.

### Case 6: Owner Cancels, Then Tries to Withdraw Again

**Scenario:** Owner calls `cancel()`, then tries to call `withdraw()`.

**Expected Behavior:**
- `cancel()` sets state to CANCELLED.
- `withdraw()` has `onlyActive` modifier, which checks `state == State.Active`.
- Revert: "Vault not active".

**Implementation:**
```solidity
function withdraw(uint256 amount) external onlyOwner onlyActive nonReentrant {
    // onlyActive ensures state == State.Active
    // CANCELLED state fails this check
    require(amount > 0, "Amount must be > 0");
    // ... rest of withdraw
}
```

## Frontend Screen Flows

### 1. Connect Wallet

```
┌────────────────────────────┐
│  Continuity - Arc Vault    │
│                            │
│  [ Connect MetaMask ]      │
│                            │
└────────────────────────────┘
       (user clicks)
              ↓
┌────────────────────────────┐
│ Connected: 0x1234...ef     │
│ Balance: 123.45 USDC       │
│                            │
│ [ Create New Vault ]       │
│ [ View My Vaults ]         │
│ [ Claim Beneficiary Funds] │
└────────────────────────────┘
```

### 2. Create Vault

```
┌─────────────────────────────────────────┐
│  Create New Vault                       │
│                                         │
│  Beneficiary Address:                   │
│  [ 0x... ]                              │
│                                         │
│  Check-in Interval:                     │
│  [ 30 days ] [ 90 days ] [ 180 days ]   │
│                                         │
│  Grace Period (days):                   │
│  [ 7 ] (optional)                       │
│                                         │
│  Amount (USDC):                         │
│  [ 100 ]                                │
│                                         │
│  [ Create Vault ]                       │
│                                         │
└─────────────────────────────────────────┘
       (after approval & tx)
              ↓
┌─────────────────────────────────────────┐
│  Vault Created!                         │
│  Address: 0x5678...abcd                 │
│  Balance: 100 USDC                      │
│                                         │
│  [ Go to Dashboard ]                    │
└─────────────────────────────────────────┘
```

### 3. Owner Dashboard

```
┌─────────────────────────────────────────┐
│  Your Vault                             │
│                                         │
│  Status: ACTIVE                         │
│  Balance: 100 USDC                      │
│  Beneficiary: 0xabcd...1234             │
│                                         │
│  Check-in Interval: 90 days             │
│  Last Check-in: 3 days ago              │
│  Time Until Deadline: 87 days           │
│                                         │
│  [ Check In Now ]                       │
│  [ Withdraw USDC ]                      │
│  [ Cancel Vault ]                       │
│                                         │
└─────────────────────────────────────────┘
       (click "Check In")
              ↓
   "Check-in successful. Deadline reset."
```

### 4. Beneficiary Claim Page

```
┌─────────────────────────────────────────┐
│  Claim Funds                            │
│                                         │
│  Connected as: 0xefgh...5678            │
│                                         │
│  Claimable Vaults:                      │
│  ┌─────────────────────────────────────┐
│  │ Vault: 0x5678...abcd                │
│  │ Amount: 100 USDC                    │
│  │ Owner: 0x1234...ef                  │
│  │ Status: CLAIMABLE                   │
│  │ [ Claim ]                           │
│  └─────────────────────────────────────┘
│                                         │
│  (empty state if no claimable vaults)   │
│  "No claimable vaults found."           │
│                                         │
└─────────────────────────────────────────┘
       (click "Claim")
              ↓
   "Funds claimed! 100 USDC sent to your wallet."
```

## Testing Strategy

### Unit Tests (Hardhat + Mocha/Chai)

**Files:** `test/VaultFactory.test.js`, `test/Vault.test.js`

Contracts are exercised through `ethers` against a local Hardhat network
configured with Arc's chain ID (5042, set in `hardhat.config.js`) so the
on-chain "Arc mainnet only" checks behave the same as in production. USDC is
stood in for by `src/mocks/MockUSDC.sol` (a plain OZ `ERC20`); a second
double, `src/mocks/ReentrantUSDC.sol`, attempts to re-enter `claim()` from
inside `transfer()` to exercise the reentrancy guard. Both are test-only and
are never referenced by the deployed contracts or `script/deploy.js`.

Coverage (31 tests total, run with `npm test`):
- Vault creation, initialization, and the implementation-lock against direct `initialize()` calls.
- `deposit`, `checkIn` (including the CLAIMABLE → ACTIVE recovery path), `claim`, `withdraw`, `cancel`.
- Edge cases: check-in one second before the deadline, claim one second after, double-claim rejection, claiming with a zero balance.
- Access control reverts for every owner-only / beneficiary-only function.
- `VaultFactory`: one-vault-per-owner enforcement, invalid-beneficiary/interval reverts, `vaultCount`/`getAllVaults` bookkeeping.
- Reentrancy: a malicious token cannot cause a double payout.

### Integration Tests

- Deploy on Arc mainnet fork (via `hardhat_reset` / a forked network config) before going live.
- Create a real vault with real USDC.
- Test the full happy path: create → deposit → check-in → wait for deadline → claim.
- Verify frontend can interact with deployed contracts.

## Implementation Notes

### USDC Address on Arc

**Resolved** (was previously an open question): `0x3600000000000000000000000000000000000000`, per docs.arc.io. Arc's native gas token *is* USDC (18 decimals, like ETH on most EVM chains); this address is Circle's separate ERC-20 *view* over that same native balance (6 decimals) — it's what `approve`/`transferFrom`/`transfer`/`balanceOf` calls target, which is exactly the standard-ERC20 interface `Vault.sol` already assumes. See `memory.md` Decision 7 for how this was confirmed and its sources. Set in `.env.example` → `ARC_USDC_ADDRESS`.

The shipped implementation sets `USDC` as `immutable` rather than a literal
`constant`, passed once into `Vault`'s constructor by `VaultFactory` at
deployment time (`script/deploy.js`). This keeps the "no chain abstraction,
no runtime configurability" property — the value can never change after
deployment, and every clone shares the same immutable address via
delegatecall. That choice was originally made to avoid an invalid placeholder
address (`0x...`) in committed source while the real address was still
unknown; now that it's resolved, `immutable` remains the better choice
anyway — it means `Vault.sol` never needs editing again even if Circle were
to reissue the token at a new address, since only the deploy-time argument
would change.

Two small hardening details not shown in the snippets above, both present in
`src/Vault.sol`:
- `checkIn()` only accepts calls while `state` is `Active` or `Claimable` (not `Claimed`/`Cancelled`).
- `initialize()` and `createVault()` both reject `beneficiary == owner`.

### Factory vs. Proxy Pattern

For MVP, the factory uses minimal proxy clones (Clones.clone from OpenZeppelin) for gas efficiency. Each vault is a separate instance; this is simpler than complex proxy patterns and adequate for a PoC.

### Deposit Mechanics

To keep things simple, the owner calls `USDC.approve(vaultAddress, amount)` once in the frontend, then calls `vault.deposit(amount)`. This is standard ERC20 approve-then-transfer flow.

Alternatively, the frontend could estimate gas and do the approval in a single transaction with the vault factory, but single-step approval is clearer for a PoC.

## Future Improvements (Out of Scope for MVP)

1. **Multi-beneficiary:** Extend state to support an array of beneficiaries with percentage splits.
2. **Notifications:** Offchain service (The Graph, Chainlink Functions, or a simple backend) watches vaults and sends email/SMS reminders.
3. **Alternative verification:** Replace time-based inactivity with on-chain oracle proving death/incapacity (complex, likely out of scope).
4. **Other tokens:** Generalize to support USDC, USDT, DAI, etc.
5. **Recovery codes:** Let owner generate offline recovery codes as additional security mechanism.
