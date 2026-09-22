# Product Requirements Document: Continuity

## Problem Statement

Self-custodied cryptocurrency has solved the problem of financial intermediaries — users can hold their own keys and transact peer-to-peer without a bank. But self-custody created a new, harder problem: **there is no inheritance mechanism**. If a self-custody user dies, loses their keys, or disappears, their funds are gone forever. There is no "next of kin" process, no recovery, no succession plan. A regular bank account can be transferred to heirs; a crypto wallet cannot.

This is a real blocker for mainstream adoption. Non-technical users are rightly afraid of self-custody precisely because it feels like all-or-nothing: lose your keys once, and everything is gone.

## Target Users

1. **Indie USDC holders** — People who self-custody stablecoins and want a safety net they understand and trust, with no middleman taking custody on their behalf.
2. **First-time chain users** — People new to cryptocurrency who want the non-custodial model but feel vulnerable because there's no fallback for human risk (death, loss of access).
3. **Anyone with a trusted beneficiary** — Parents setting aside funds for children, individuals with spouses, business partners with succession plans, etc.

## Goals

- **Primary:** Prove a working, non-custodial USDC inheritance mechanism deployed and functional on Arc mainnet, with real funds held in the vault.
- **Secondary:** Demonstrate that Arc is a viable platform for consumer financial infrastructure (gas-in-USDC, reliable RPC, straightforward contract deployment).
- **Scope:** Single beneficiary per vault (v1 MVP); no multi-beneficiary splits, no legal integration, no email/SMS notifications, no fiat on/off-ramp.

## Non-Goals

- Legal probate integration or validation of beneficiary identity.
- Multi-beneficiary splits or percentage distributions.
- Email, SMS, or push notifications for check-ins or deadlines.
- Support for traditional assets or other tokens (USDC only, for now).
- Decentralized verification of death or incapacity (relies on contract logic only).

## User Stories

### Story 1: Owner Creates and Manages a Vault

**As** an indie USDC holder  
**I want** to deposit my USDC into a non-custodial vault and designate a beneficiary  
**So that** if I become inactive, my funds automatically go to someone I trust, without a middleman holding my keys.

**Acceptance Criteria:**
- I can connect my wallet (MetaMask or similar).
- I can deposit any amount of USDC >= $10 (to avoid dust).
- I can specify a beneficiary address and a check-in interval (30, 90, or 180 days).
- I can see the vault status, including time until the beneficiary can claim.
- I can call `checkIn()` to reset the countdown at any time.
- I can withdraw funds or cancel the vault entirely while active.
- I can reclaim control even after the deadline passes, as long as the beneficiary hasn't claimed yet.

### Story 2: Beneficiary Claims Funds

**As** a designated beneficiary  
**I want** to claim the USDC from a vault whose owner has been inactive for too long  
**So that** I can access funds the owner intended for me if they disappear.

**Acceptance Criteria:**
- I can see a list of vaults for which I am the beneficiary.
- I can only claim after the vault's deadline (interval + grace period) has passed.
- Once I call `claim()`, the funds are transferred to my wallet.
- If the owner checks in before I claim, I lose the ability to claim (vault returns to active state).
- The claim is atomic and non-reversible once executed.

## Functional Requirements

1. **VaultFactory Contract**
   - Deploys a new `Vault` instance for each owner.
   - Each owner has exactly one vault (future: allow multiple, but scope to one for MVP).
   - Tracks all vault addresses for discovery.

2. **Vault Contract**
   - Holds USDC in escrow on behalf of the owner.
   - Implements state machine: `Active` → `Claimable` → `Claimed`.
   - Enforces access control: only owner can check-in/withdraw while active; only beneficiary can claim when claimable.
   - Tracks:
     - Beneficiary address
     - Check-in interval (seconds)
     - Grace period (seconds)
     - Last check-in timestamp
     - Current state

3. **Frontend UI**
   - Wallet connection (MetaMask/ethers.js).
   - Create-vault flow: input amount, beneficiary, interval, grace period.
   - Owner dashboard: display vault status, countdown, check-in button, withdraw/cancel buttons.
   - Beneficiary claim page: list claimable vaults, claim button.

## Non-Functional Requirements

1. **Security:** No admin backdoor, no privileged roles, reentrancy guards on all external calls.
2. **Gas efficiency:** Minimal contract size; check-in should be cheap (< $0.01 in Arc gas).
3. **Testability:** 100% of contract logic covered by unit tests (edge cases: owner checks in at deadline - 1 second, beneficiary claims at deadline + 1 second, etc.).
4. **Auditability:** Contract logic is straightforward and readable; no complex interactions or hidden state.

## Arc Mainnet Specific (CRITICAL — NOT PORTABLE TO OTHER CHAINS)

This product is built **exclusively for Arc mainnet**. It is not a general-purpose contract that could work on any EVM chain.

- **Chain ID:** Hardcoded to 1329 (Arc mainnet only; rejects other chains at contract level)
- **Gas currency:** USDC (Arc's native gas token). All transactions must be executable with minimal USDC on hand.
- **RPC endpoint:** Hardcoded to https://rpc.arc.io (or Circle's official Arc RPC); no fallback RPCs.
- **Token:** USDC on Arc mainnet (address to be confirmed from Circle, then hardcoded in Vault.sol).
- **Deployment target:** Arc mainnet only (no testnet, no other chains; live funds required for the grant).
- **No chain abstraction:** No environment variables for chain ID, no chain-selection UI, no portability layer.
- **Verification:** VaultFactory constructor verifies `chainid() == 1329` at deployment; deployment fails if not on Arc.

## DoraHacks Submission Checklist

- [ ] **Live deployment on Arc mainnet** — VaultFactory and one demo Vault deployed with real USDC.
- [ ] **Public repository** — GitHub (or GitLab/Bitbucket) with all source code, tests, and docs.
- [ ] **Project description** — Short summary (< 200 words) of what the project does and why Arc is essential to it.
- [ ] **Public builder profile** — GitHub, X, or Farcaster profile linked in submission.
- [ ] **No conflicting funding** — Not previously funded by Circle or Arc programs.
- [ ] **Deployed and working** — Functional end-to-end on Arc mainnet at submission time.

## Success Criteria

**For the grant:** Submission is accepted and the project is awarded a $500 USDC microgrant (confirmed by Oct 21, 2026).

**For the product:** 
- All unit tests pass.
- Contracts deploy successfully on Arc mainnet with real USDC.
- A fresh user can create a vault, the owner can check in, time can be simulated to test the claim mechanic, and the beneficiary can claim, all on mainnet.
- No contracts are upgraded or redeployed mid-demo; the same instances run from submission through review.
