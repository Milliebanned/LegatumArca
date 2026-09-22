# Architecture: Legatumarca

## Overview

Legatumarca is a non-custodial USDC vault system on Arc mainnet. It consists of:

1. **Smart Contracts (Solidity)**
   - `VaultFactory.sol` — Factory contract that creates and tracks individual vaults.
   - `Vault.sol` — Individual vault logic; holds USDC and enforces the check-in/claim state machine.

2. **Frontend (React + ethers.js)**
   - Minimal web interface for wallet connection, vault creation, owner dashboard, and beneficiary claim UI.

3. **Deployment & Testing**
   - Hardhat for contract compilation, testing, and deployment.
   - Environment configuration for Arc mainnet.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────┐   │
│  │   Wallet    │ │Create Vault  │ │ Owner Dashboard +      │   │
│  │  Connect    │ │  Form        │ │ Beneficiary Claim Page │   │
│  └─────────────┘ └──────────────┘ └────────────────────────┘   │
└────────────────────────────────────────────────────────────────┬┘
                                                                   │
                    (ethers.js / web3.js)                         │
                                                                   │
┌────────────────────────────────────────────────────────────────┬┘
│                        Arc Mainnet                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           VaultFactory (0x...)                           │  │
│  │  • createVault(beneficiary, interval, gracePeriod)       │  │
│  │  • vaults[owner] → Vault address                         │  │
│  │  • allVaults → array of all vault addresses              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Vault Instance (per owner)                     │  │
│  │  • state: Active / Claimable / Claimed                   │  │
│  │  • owner, beneficiary, amount (USDC)                     │  │
│  │  • checkInInterval, gracePeriod                          │  │
│  │  • lastCheckInTime                                       │  │
│  │                                                           │  │
│  │  Functions:                                               │  │
│  │  • checkIn() [owner]                                      │  │
│  │  • claim() [beneficiary, only if claimable]               │  │
│  │  • withdraw(amount) [owner, only if active]               │  │
│  │  • cancel() [owner, only if active]                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           USDC Token (Circle, Arc mainnet)               │  │
│  │  • balanceOf(Vault address)                              │  │
│  │  • transfer(from, to, amount)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## State Machine

Each `Vault` instance follows this state machine:

```
Initial State
     │
     ├─ owner deposits USDC
     │
     ▼
  ACTIVE
  ┌──────────────────────────────────────────┐
  │ • Owner can checkIn() → resets deadline   │
  │ • Owner can withdraw() → removes USDC    │
  │ • Owner can cancel() → closes vault       │
  │ • Beneficiary cannot claim                │
  │ • If no checkIn for (interval + grace)... │
  │                                           │
  │                  ▼                        │
  │            CLAIMABLE                      │
  │   ┌─────────────────────────┐             │
  │   │ • Beneficiary can claim │             │
  │   │ • Owner can still       │             │
  │   │   checkIn() & return to │             │
  │   │   ACTIVE                │             │
  │   │                         │             │
  │   │    ▼                    │             │
  │   │  CLAIMED (terminal)     │             │
  │   │ • Beneficiary got funds │             │
  │   │ • Vault is closed       │             │
  │   └─────────────────────────┘             │
  │                                           │
  │ OR owner calls cancel() → terminal        │
  │    (CANCELLED)                            │
  └──────────────────────────────────────────┘
```

### State Transitions

| From | Event | To | Who |
|------|-------|-----|------|
| ACTIVE | checkIn() | ACTIVE | Owner |
| ACTIVE | (deadline passed) | CLAIMABLE | Time |
| ACTIVE | withdraw() | ACTIVE | Owner |
| ACTIVE | cancel() | CANCELLED | Owner |
| CLAIMABLE | checkIn() | ACTIVE | Owner |
| CLAIMABLE | claim() | CLAIMED | Beneficiary |

## Data Flow

### 1. Creation Flow

```
User → Frontend → VaultFactory.createVault()
                    ↓
                 New Vault instance deployed
                    ↓
                 VaultFactory records vault address
                    ↓
                 User approves USDC transfer
                    ↓
                 User deposits USDC via Vault.deposit()
                    ↓
                 Vault enters ACTIVE state
```

### 2. Check-In Flow

```
Owner (on Frontend) → checkIn() button
                        ↓
                   Vault.checkIn() called
                        ↓
                   lastCheckInTime updated
                        ↓
                   Deadline reset to now + interval
                        ↓
                   State remains ACTIVE
```

### 3. Claim Flow (Beneficiary, After Deadline)

```
Beneficiary (on Frontend) → claim() button
                              ↓
                         Check: now > (lastCheckIn + interval + grace)
                              ↓
                         If true: transfer USDC to beneficiary
                              ↓
                         If false: revert ("Vault still active")
                              ↓
                         State changes to CLAIMED
```

### 4. Withdrawal Flow (Owner, While Active)

```
Owner → withdraw(amount) button
           ↓
        Check: vault is ACTIVE
           ↓
        Check: amount ≤ vault balance
           ↓
        Transfer USDC to owner
           ↓
        Vault balance decreases
           ↓
        State remains ACTIVE
```

## Security Model

### Access Control

- **Owner-only functions:** `checkIn()`, `withdraw()`, `cancel()`
- **Beneficiary-only functions:** `claim()`
- **Public functions:** None (all require authentication by contract state)

### Reentrancy Guards

- Use OpenZeppelin's `ReentrancyGuard` on all functions that call external contracts (namely, USDC transfers).
- Order: checks → effects → interactions (CEI pattern).

### Example (Vault.claim)

```solidity
function claim() external onlyBeneficiary nonReentrant {
    // checks
    require(block.timestamp > deadlineTime, "Vault still active");
    require(state == State.CLAIMABLE, "Vault is not claimable");
    
    // effects
    state = State.CLAIMED;
    uint256 amount = IERC20(USDC_ADDRESS).balanceOf(address(this));
    
    // interactions
    IERC20(USDC_ADDRESS).transfer(beneficiary, amount);
}
```

### No Admin Backdoor

- There is no owner/admin role on VaultFactory or Vault contracts.
- No pause function, no emergency withdrawal, no upgrade mechanism.
- All logic is deterministic and onchain-auditable.

## Arc Mainnet Integration

### Hardcoded Arc Mainnet Configuration

**This contract is Arc-mainnet-only. No chain selection, no fallbacks, no portability.**

```solidity
// Constants in Vault.sol (hardcoded, not configurable)
address public constant USDC = 0x3600000000000000000000000000000000000000; // Arc mainnet USDC (verified, docs.arc.io)
uint256 public constant CHAIN_ID = 5042; // Arc mainnet chain ID
string public constant CHAIN_NAME = "Arc";
```

```javascript
// Frontend constants (hardcoded, not configurable)
const ARC_CHAIN_ID = 5042;
const ARC_RPC_URL = "https://rpc.mainnet.arc.io";
const VAULT_FACTORY_ADDRESS = "0x..."; // Deployed address after Phase 3
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; // Arc mainnet USDC (verified, docs.arc.io)
```

**No chain abstraction, no fallback chains, no environment selection.** The contract will revert if called from any other chain.

### Gas & Costs (Arc Mainnet)

All transactions are paid for in USDC directly (no separate gas token):

- **Check-in:** ~50k gas = ~$0.01 USDC (based on Arc gas pricing)
- **Claim:** ~80k gas = ~$0.02 USDC
- **Deposit/Withdraw:** ~100k gas = ~$0.025 USDC
- **Create vault:** One-time, ~150k gas from factory

Arc's native gas currency is USDC, which means every operation is already stablecoin-denominated—no ETH/MATIC volatility to worry about.

### Official Arc RPC Endpoint

```
Primary RPC: https://rpc.mainnet.arc.io
Chain ID: 5042
Currency: USDC (not ETH)
```

No fallback RPC needed; Arc's official endpoint is the only one used.

## Deployment Strategy

### 1. Local Testing (Hardhat)

```bash
npm run build
npm test
```

### 2. Deployment Script

```javascript
// script/deploy.js
const { ethers, network } = require("hardhat");

async function main() {
  if (network.name !== "arc") throw new Error("Use --network arc");
  const usdc = process.env.ARC_USDC_ADDRESS;
  const Factory = await ethers.getContractFactory("VaultFactory");
  const factory = await Factory.deploy(usdc);
  await factory.waitForDeployment();
  console.log("VaultFactory deployed at:", await factory.getAddress());
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

### 3. Arc Mainnet Deployment

```bash
npx hardhat run script/deploy.js --network arc
```

### 4. Verification

- Record the VaultFactory address.
- Create a demo vault from the frontend, deposit real USDC, and verify the vault is created and holds the funds.

## Frontend Architecture

### Tech Stack

- **Framework:** React 18+
- **Web3:** ethers.js v6
- **Styling:** Minimal CSS (no heavy framework needed for MVP)
- **State:** React hooks (useState, useEffect)

### Components

1. **WalletConnect** — detects installed browser wallets via EIP-6963 (MetaMask, Rabby, Coinbase Wallet, Brave, OKX, etc.), lets the user pick one, and stores its address/signer. Falls back to `window.ethereum` for a wallet that hasn't adopted EIP-6963.
2. **CreateVault** — Form to set beneficiary, interval, grace period; calls factory.createVault().
3. **OwnerDashboard** — Shows vault status, countdown to deadline, check-in button, withdraw/cancel.
4. **BeneficiaryClaim** — If user is a beneficiary of any vault, shows claimable vaults and claim button.

### Key Functions (Arc Mainnet Only)

```javascript
// Arc Mainnet Configuration (hardcoded, not configurable)
const ARC_CONFIG = {
  chainId: 5042,
  rpcUrl: "https://rpc.mainnet.arc.io",
  factoryAddress: "0x...", // Deployed address
  usdcAddress: "0x3600000000000000000000000000000000000000", // Circle USDC on Arc (verified, docs.arc.io)
};

// Connect wallet and verify Arc mainnet
const connectWallet = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // Verify connected chain is Arc mainnet
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(ARC_CONFIG.chainId)) {
    throw new Error(`Please switch to Arc mainnet (chainId 5042). Currently on ${network.chainId}`);
  }
  
  setUserAddress(await signer.getAddress());
  setProvider(provider);
  setSigner(signer);
};

// Create vault (Arc mainnet only)
const createVault = async (beneficiary, interval, grace, amount) => {
  // Verify chain before proceeding
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(ARC_CONFIG.chainId)) {
    throw new Error("Must be on Arc mainnet (chainId 5042)");
  }
  
  const factory = new ethers.Contract(
    ARC_CONFIG.factoryAddress,
    FACTORY_ABI,
    signer
  );
  const tx = await factory.createVault(beneficiary, interval, grace);
  await tx.wait();
};

// Check in (Arc mainnet only)
const checkIn = async (vaultAddress) => {
  const vault = new ethers.Contract(
    vaultAddress,
    VAULT_ABI,
    signer
  );
  const tx = await vault.checkIn();
  await tx.wait();
};

// Claim (Arc mainnet only)
const claim = async (vaultAddress) => {
  const vault = new ethers.Contract(
    vaultAddress,
    VAULT_ABI,
    signer
  );
  const tx = await vault.claim();
  await tx.wait();
};
```

## Deployment Checklist

- [ ] VaultFactory deployed on Arc mainnet.
- [ ] One demo Vault created with real USDC.
- [ ] Frontend connects to mainnet (not localhost).
- [ ] Wallet connection works (MetaMask confirmed).
- [ ] Create-vault flow tested end-to-end.
- [ ] Check-in function tested (verify time tracking).
- [ ] Claim logic tested (simulate deadline, verify revert if too early).
- [ ] All addresses and contract ABIs hardcoded in frontend.

## Future Extensions (Out of Scope for MVP)

- Multi-beneficiary splits by percentage.
- Notifications (email/SMS) for approaching deadlines.
- Proof-of-custody or KYC integration for beneficiary verification.
- Support for other tokens (ETH, DAI, etc.).
- Multiple vaults per owner.
- Decentralized arbitration for disputed claims.
