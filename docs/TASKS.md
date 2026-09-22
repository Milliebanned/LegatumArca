# Build Tasks: Continuity

## Overview

This is the ordered checklist for shipping Continuity from design to live mainnet deployment and microgrant submission. Tasks are organized by phase and should be completed in sequence (with some parallelization noted).

> **Tooling note:** the project uses **Hardhat**, not Foundry — `package.json`
> and `hardhat.config.js` were already set up that way before contract work
> started. Steps below that reference `forge`/`anvil` were adapted to their
> Hardhat equivalents (`npx hardhat ...`) as they were completed; see
> `docs/ARCHITECTURE.md` and `docs/DESIGN.md` for the updated commands.

---

## Phase 1: Project Setup & Scaffolding

- [x] **1.1** Initialize git repository
  - `git init` in `continuity/` folder
  - Create `.gitignore` (Solidity: build/, node_modules/, .env; Node: dist/, .DS_Store)
  - Create initial commit with folder structure

- [x] **1.2** Set up Solidity development environment
  - Hardhat (not Foundry — see tooling note above)
  - `npx hardhat compile` works, sources at `./src`

- [x] **1.3** Install OpenZeppelin contracts
  - `npm install @openzeppelin/contracts` (v5.6.1)
  - Verify imports work: `import "@openzeppelin/contracts/token/ERC20/IERC20.sol";`

- [ ] **1.4** Set up Node.js frontend environment
  - `npm init -y` in `frontend/` folder
  - Install ethers.js: `npm install ethers`
  - Install React: `npm install react react-dom`
  - Install build tooling: `npm install -D vite @vitejs/plugin-react`

- [x] **1.5** Create `.env.example`
  - Document required env vars: ARC_RPC_URL, ARC_CHAIN_ID, ARC_USDC_ADDRESS, PRIVATE_KEY
  - Do NOT commit actual `.env`

---

## Phase 2: Smart Contract Development (Solidity)

### Core Contract: Vault.sol

- [x] **2.1** Write Vault.sol skeleton
  - State variables (owner, beneficiary, checkInInterval, gracePeriod, lastCheckInTime, state enum)
  - Events (Initialized, CheckedIn, Deposited, Withdrawn, Claimed, Cancelled)
  - Modifiers (onlyOwner, onlyBeneficiary, onlyActive)
  - Initialize function

- [x] **2.2** Implement Vault.sol core functions
  - `deposit(amount)` — owner deposits USDC
  - `checkIn()` — owner resets deadline, optionally returns from CLAIMABLE to ACTIVE
  - `deadlineTime()` — computed property
  - `updateState()` — auto-transition from ACTIVE to CLAIMABLE if deadline passed
  - `claim()` — beneficiary claims funds if claimable
  - `withdraw(amount)` — owner withdraws while active
  - `cancel()` — owner cancels vault and withdraws all

- [x] **2.3** Add ReentrancyGuard to Vault.sol
  - Inherit from `ReentrancyGuard`
  - Apply `nonReentrant` modifier to all functions that call external contracts (claim, withdraw, cancel, deposit)

- [x] **2.4** Add view functions
  - `balance()` — current USDC balance in vault
  - `timeUntilDeadline()` — seconds until deadline (0 if already past)
  - `getVaultState()` — return current state (for frontend)

- [x] **2.5** Write unit tests for Vault.sol
  - Test: Create vault, initialize, state is ACTIVE
  - Test: Owner deposits USDC, balance increases
  - Test: Owner checks in, deadline resets
  - Test: Beneficiary cannot claim before deadline (revert)
  - Test: Beneficiary can claim after deadline (funds transferred)
  - Test: Owner can reclaim after deadline (checkIn → ACTIVE)
  - Test: Owner can withdraw while active
  - Test: Owner can cancel
  - Test: Reentrancy protection (nonReentrant guards)
  - Test: Edge case — owner checks in 1 second before deadline
  - Test: Edge case — beneficiary claims 1 second after deadline
  - Run: `npx hardhat test`
  - Verify: All tests pass (31/31 passing)

### Factory Contract: VaultFactory.sol

- [x] **2.6** Write VaultFactory.sol skeleton
  - State: vaultImplementation, mapping(owner → vault), allVaults[]
  - Constructor: deploy Vault implementation for cloning
  - Event: VaultCreated

- [x] **2.7** Implement VaultFactory functions
  - `createVault(beneficiary, checkInInterval, gracePeriod)` — creates a clone of Vault, initializes it
  - `vaultCount()` — return number of vaults
  - `getAllVaults()` — return list of all vault addresses
  - `vaults[owner]` — getter for owner's vault address

- [x] **2.8** Write unit tests for VaultFactory.sol
  - Test: Factory creates vault via clone
  - Test: Vault is initialized correctly
  - Test: One vault per owner (revert on duplicate)
  - Test: getAllVaults returns correct list
  - Run: `npx hardhat test`
  - Verify: All tests pass

---

## Phase 3: Deployment & Arc Mainnet Integration

- [ ] **3.1** Confirm Arc Mainnet Configuration (CRITICAL)
  - Verify Arc chain ID: **1329** (hardcoded constant)
  - Confirm USDC token address on Arc mainnet from Circle docs
  - Confirm Arc RPC endpoint: https://rpc.arc.io (or Circle's official RPC)
  - Record official block explorer URL (for verification)
  - **Hardcode all values in Vault.sol and frontend** — NO environment variables, NO fallbacks
  - Example:
    ```solidity
    uint256 public constant CHAIN_ID = 1329; // Arc mainnet (hardcoded)
    address public constant USDC = 0x...; // Arc USDC (hardcoded from Circle)
    ```

- [x] **3.2** Create deployment script (Hardhat) for Arc Mainnet
  - File: `script/deploy.js`
  - Script deploys VaultFactory (which deploys the Vault implementation in its own constructor)
  - VaultFactory constructor verifies chain ID == 1329 (will revert if wrong chain)
  - Script itself also refuses to run on any network but `arc`
  - Script requires `ARC_USDC_ADDRESS` to be set, logs deployed addresses to console
  - Remaining: run against real Arc RPC and confirm on Arc explorer (blocked on 3.1/3.4 open questions)

- [ ] **3.3** Test deployment on local fork
  - `npx hardhat run script/deploy.js --network arc` against a forked Arc RPC
  - Verify no errors and output shows deployed address

- [ ] **3.4** Gather Arc mainnet details
  - Arc mainnet RPC URL (e.g., https://rpc.arc.io)
  - Arc mainnet chain ID (e.g., 1329)
  - USDC token address on Arc
  - Update `.env.example` with these values

- [ ] **3.5** Prepare mainnet deployment
  - Set `PRIVATE_KEY` in `.env` (wallet with USDC to fund test vault)
  - Verify wallet has sufficient USDC for deployment gas + demo vault funding (e.g., $50)

- [ ] **3.6** Deploy to Arc mainnet
  - `forge script script/Deploy.s.sol --rpc-url https://rpc.arc.io --private-key $PRIVATE_KEY --broadcast`
  - Record VaultFactory address and update README.md
  - Verify deployment on Arc block explorer (if available)

- [ ] **3.7** Create demo vault on mainnet
  - Using frontend or cast, create a vault with real USDC
  - Deposit $10-20 USDC as demonstration
  - Record Vault instance address and beneficiary address

---

## Phase 4: Frontend Development (React)

### Wallet & Context Setup

- [ ] **4.1** Set up ethers.js provider & signer
  - Create `frontend/src/Web3Context.jsx` (or similar)
  - Detect MetaMask availability
  - Expose provider, signer, userAddress, balance

- [ ] **4.2** Create WalletConnect component
  - Button: "Connect MetaMask"
  - On click: request account access via `eth_requestAccounts`
  - Display connected address (truncated)
  - Display USDC balance

### Create Vault Flow

- [ ] **4.3** Build CreateVault.jsx component
  - Form fields: beneficiary address, check-in interval (radio or dropdown), grace period, amount
  - On submit:
    - Approve USDC transfer (if not already approved)
    - Call factory.createVault()
    - Wait for tx confirmation
    - Display success message with new vault address

- [ ] **4.4** Test create-vault flow on mainnet
  - Connect wallet
  - Fill form
  - Submit and verify vault is created
  - Verify initial USDC deposit is held in vault

### Owner Dashboard

- [ ] **4.5** Build OwnerDashboard.jsx component
  - Fetch user's vault address from factory
  - Display vault state (ACTIVE, CLAIMABLE, CLAIMED, CANCELLED)
  - Display balance, beneficiary, check-in interval
  - Display countdown: "X days until deadline" (or "Deadline passed")
  - Check In button: calls `vault.checkIn()`
  - Withdraw button: prompts for amount, calls `vault.withdraw(amount)`
  - Cancel button: calls `vault.cancel()`

- [ ] **4.6** Test owner dashboard
  - Create vault via create-vault flow
  - Verify dashboard displays correct info
  - Click "Check In", verify deadline resets in UI
  - Wait (or mock time), verify state changes to CLAIMABLE

### Beneficiary Claim Flow

- [ ] **4.7** Build BeneficiaryClaim.jsx component
  - Query all vaults from factory
  - Filter vaults where user's address == beneficiary AND state == CLAIMABLE
  - Display list of claimable vaults
  - Claim button: calls `vault.claim()` on the selected vault
  - Show confirmation after claim

- [ ] **4.8** Test beneficiary claim flow
  - Create vault with known beneficiary address
  - Simulate deadline passing (use anvil `--block-time 1` or similar)
  - Switch to beneficiary wallet
  - Verify vault appears in "Claimable" list
  - Click "Claim", verify USDC is transferred to beneficiary

### UI Polish & Integration

- [ ] **4.9** Add loading states & error handling
  - Show spinner during tx confirmation
  - Display error messages from contract reverts
  - Toast notifications for success/failure

- [ ] **4.10** Integrate into single App.jsx
  - Router to switch between pages (Connect → Create → Dashboard/Claim)
  - Navigation header

---

## Phase 5: Testing & Verification

- [ ] **5.1** Run full contract test suite
  - `forge test -vv`
  - All tests must pass
  - No warnings

- [ ] **5.2** Manual end-to-end test on Arc mainnet
  - Using frontend:
    - Connect wallet (owner address)
    - Create vault with beneficiary address
    - Deposit USDC
    - Verify dashboard shows correct countdown
    - Check in, verify deadline resets
  - Simulate deadline (or wait):
    - Switch to beneficiary wallet
    - Verify vault appears as claimable
    - Claim USDC
    - Verify transfer completed

- [ ] **5.3** Test edge cases
  - Owner checks in at deadline - 1 second
  - Owner checks in after deadline but before beneficiary claim
  - Beneficiary tries to claim before deadline (should revert)
  - Owner withdraws partial amount
  - Owner cancels

- [ ] **5.4** Verify Arc Mainnet Integration (CRITICAL)
  - Test that VaultFactory constructor rejects deployment on wrong chain
  - Test that frontend throws error if MetaMask is on a non-Arc chain
  - Verify all hardcoded constants match Arc mainnet (chain ID 1329, correct USDC address)
  - Confirm deployment script only accepts Arc mainnet RPC
  - Verify no fallback chains, no env var chain config, no chain-selection UI

- [ ] **5.5** Verify no attribution leakage
  - Search the codebase, docs and commit messages for stray attribution or credit lines
  - Remove any accidental comments or attribution

---

## Phase 6: Documentation & Polishing

- [ ] **6.1** Complete README.md
  - Finalize all placeholder URLs and addresses
  - Test that setup instructions work (clone → npm install → forge build)
  - Add link to live demo vault on Arc explorer

- [ ] **6.2** Update docs/ files
  - Verify ARCHITECTURE.md reflects actual deployment
  - Verify DESIGN.md matches implemented interfaces
  - Verify TASKS.md is up-to-date (this file)

- [ ] **6.3** Add inline code comments (minimal)
  - Only document WHY, not WHAT (code is self-documenting)
  - Flag edge cases or non-obvious logic

- [ ] **6.4** Record demo video (optional but recommended)
  - ~2 min walkthrough: create vault → check in → wait/skip time → beneficiary claim
  - Upload to a platform (YouTube, Vimeo, etc.) and link in submission

---

## Phase 7: Submission Preparation

- [ ] **7.1** Verify submission checklist
  - [ ] Live deployment on Arc mainnet (VaultFactory + demo Vault) ✓
  - [ ] Public repository (GitHub/GitLab) ✓
  - [ ] README.md with setup, usage, contract addresses ✓
  - [ ] Short description (< 200 words) of what it does and why Arc is essential ✓
  - [ ] Public builder profile (GitHub/X/Farcaster) ready ✓
  - [ ] No conflicting prior funding ✓
  - [ ] Deployed and working on mainnet ✓

- [ ] **7.2** Write DoraHacks submission description
  - Problem statement (self-custody has no inheritance)
  - Solution (non-custodial vault)
  - Why Arc (USDC as gas enables low-friction on-chain settlement)
  - Live demo link
  - Repo link
  - Keep under 200 words

- [ ] **7.3** Final code review
  - Read through contracts for any obvious bugs or security issues
  - Verify all event emissions are present
  - Verify all access controls are in place

- [ ] **7.4** Test on Arc mainnet one last time
  - Create fresh vault
  - Verify all operations work
  - Document any final findings

---

## Phase 8: Submit to DoraHacks

- [ ] **8.1** Submit to DoraHacks
  - Go to https://dorahacks.io/hackathon/arc-microgrants/detail
  - Click "Submit BUIDL" or similar
  - Fill form with:
    - Project name: "Continuity"
    - Description: (from 7.2)
    - Live deployment link: (Arc mainnet explorer link to VaultFactory)
    - Repository link: (GitHub URL)
    - Builder profile: (GitHub/X/Farcaster)
  - Submit and wait for decision (rolling reviews, decisions by Oct 21, 2026)

- [ ] **8.2** Monitor submission status
  - Check email for updates
  - Be available for verification step if selected

---

## Parallelization Notes

- **2.1 ↔ 4.1:** Contract skeleton and frontend setup can happen in parallel
- **2.2-2.4 ↔ 4.3-4.7:** Core contracts and frontend can be built concurrently (as long as ABIs are finalized)
- **3.1-3.4:** Arc mainnet research should happen early (Phase 1-2) to avoid delays
- **5.x:** All testing should happen after Phase 4 completes

---

## Timeline Estimate

- Phase 1: 1-2 hours (setup, scaffolding)
- Phase 2: 8-12 hours (contract dev + tests)
- Phase 3: 2-4 hours (deployment, mainnet integration)
- Phase 4: 8-12 hours (frontend dev)
- Phase 5: 2-3 hours (testing & verification)
- Phase 6: 2-3 hours (docs & polish)
- Phase 7: 1-2 hours (submission prep)
- **Total: ~26-39 hours** (varies by experience level)

Recommended: Start now (early Sept), aim for submission by late Sept / early Oct to allow for rollback time before Oct 14 deadline.
