# Legatumarca

A non-custodial USDC vault on Arc mainnet that releases funds to a named beneficiary automatically if the owner stops checking in.

## Why This Matters

Cryptocurrency enables self-custody — you hold your own keys, no bank or intermediary required. But self-custody has a hard problem that traditional finance solved decades ago: what happens to your money if you die, lose access, or disappear? With a bank account, heirs can recover funds. With self-custodied crypto, if you're gone, the money is gone forever. There's no inheritance mechanism, no succession process, nothing.

Legatumarca solves this: deposit USDC into a vault, name a beneficiary, and set a check-in interval. As long as you keep checking in, you retain full control. If you stop checking in for long enough, the vault automatically becomes claimable by your beneficiary — no custodian, no middleman, just contract-enforced logic.

## How It Works

1. **Create a vault** — Connect your wallet, deposit USDC, name a beneficiary address, pick a check-in interval (30/90/180 days) and grace period.
2. **Check in periodically** — Call `checkIn()` to reset the countdown and prove you're still active. This is the only ongoing action required; everything else is optional.
3. **Beneficiary claim (if you're inactive)** — If the deadline passes with no check-in, the beneficiary can call `claim()` to withdraw the funds.
4. **Safety net** — If you check in after the deadline but before the beneficiary claims, you regain full control immediately. There's always a way back.
5. **Withdraw or cancel anytime** — While active, you can withdraw funds or cancel the vault entirely. It's not a lockup.

## Tech Stack

- **Smart contracts:** Solidity (OpenZeppelin for ERC20/Clones/ReentrancyGuard) — **Arc mainnet only**
- **Deployment:** Arc mainnet exclusively; gas paid in USDC (no portability to other chains)
- **Frontend:** Minimal React + ethers.js; hardcoded for Arc mainnet (chain ID 5042)
- **Testing:** Hardhat + Mocha/Chai (unit tests run against a local node configured with Arc's chain ID)

## Arc Mainnet Requirements

**This project is built exclusively for Arc mainnet. It will not work on any other blockchain.**

- Contracts are hardcoded to Arc mainnet (chain ID 5042)
- All gas is paid in USDC (Arc's native gas currency)
- Frontend only connects to Arc's RPC endpoint
- No chain selection, no fallback chains, no portability

## Local Development

### Prerequisites

- Node.js 18+
- A wallet with USDC on Arc mainnet (for testing and demo deployment)
- Arc mainnet RPC access (public: https://rpc.mainnet.arc.io)

### Setup

```bash
git clone <repo>
cd legatumarca

# Install dependencies
npm install

# Compile contracts
npm run build

# Run tests
npm test
```

### Environment

Copy `.env.example` to `.env` and fill in the real values:

```
ARC_RPC_URL=https://rpc.mainnet.arc.io
ARC_CHAIN_ID=5042
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
PRIVATE_KEY=<your_wallet_private_key>
```

### Deploy to Arc Mainnet

```bash
npx hardhat run script/deploy.js --network arc
```

The deploy script refuses to run on any network other than `arc` (which is
itself pinned to chain ID 5042 in `hardhat.config.js`), and `VaultFactory`'s
constructor independently reverts if the live chain ID isn't 5042. Record the
printed `VaultFactory` address and update this README and the frontend config.

## Local Development (Frontend + Contracts)

To run the full stack against a local test chain instead of Arc mainnet —
useful for developing and testing the frontend without real funds:

```bash
# Terminal 1: local chain, pinned to chain ID 5042 (see hardhat.config.js)
npx hardhat node

# Terminal 2: deploy MockUSDC + VaultFactory to it, mint test USDC,
# and write the addresses into frontend/src/deployedLocal.js
npx hardhat run script/deploy-local.js --network localhost

# Terminal 3: frontend dev server
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, connect a wallet pointed at `http://127.0.0.1:8545`
(chain ID 5042 — add it as a custom network in whichever wallet extension you connect with), and a
"Mint 1,000 test USDC" button appears on every screen (dev builds only —
`npm run build` never includes it). The frontend's hardcoded `chainId: 5042`
check passes against this local chain exactly as it will against real Arc
mainnet, since no separate dev/prod branching exists in the chain-ID check
itself — only which contract addresses get compiled in
(`frontend/src/config.js`).

`script/deploy-local.js` is local-testing-only and is never used for the Arc
mainnet deployment — that's `script/deploy.js`, which refuses to run against
anything but the `arc` network.

## Live Deployment

- **Network:** Arc mainnet
- **VaultFactory Contract:** `[Contract address to be filled in after deployment]`
- **USDC Token (Arc):** `0x3600000000000000000000000000000000000000`
- **Frontend Demo:** `[URL to be filled in]`

## Usage

1. Open the frontend (URL above).
2. Connect your wallet.
3. Deposit USDC and set beneficiary/intervals.
4. Check in periodically (as often as you'd like; there's no penalty for frequent check-ins).
5. Beneficiary can claim after the deadline expires.

## Project Structure

```
legatumarca/
├── README.md
├── memory.md
├── hardhat.config.js
├── src/
│   ├── VaultFactory.sol
│   ├── Vault.sol
│   └── mocks/          # test-only doubles, never deployed
├── test/
│   ├── VaultFactory.test.js
│   ├── Vault.test.js
│   └── utils/time.js
├── script/
│   └── deploy.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── CreateVault.jsx
│   │   ├── OwnerDashboard.jsx
│   │   └── BeneficiaryClaim.jsx
│   └── package.json
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── DESIGN.md
    └── TASKS.md
```

## Security

- No privileged admin role or backdoor.
- Reentrancy guards on all external calls.
- Checks-effects-interactions pattern enforced throughout.
- Ownership and access control via onchain logic only.
- Contract fully auditable on-chain; no hidden state.

## License

MIT
