# Legatum Arca

A non-custodial dead man's switch for USDC on Arc. You deposit into a vault, name the people who should receive it, and check in on a schedule you choose. If you stop checking in, the vault pays them automatically.

## Why

Self-custody has no inheritance. If you die or lose access to your wallet, the money is stuck: there is no bank to call and nobody your family can ask. Legatum Arca gives a wallet a succession plan that needs no custodian, lawyer or middleman, only a contract that enforces the dates.

## How it works

1. **Create a vault.** Give it a name, pick a check-in window (30 days to a year) and an optional grace period, and name 1 to 10 beneficiaries with a percentage each.
2. **Deposit USDC.** It stays yours: you can withdraw part of it or close the vault at any time while it is active.
3. **Check in.** One transaction before the window ends resets the clock.
4. **If you go silent,** the window and then the grace period run out, and the vault sends every beneficiary their share, straight to their wallet. Nobody has to claim anything.
5. **Safety net.** Checking in after the deadline still works, as long as the payout has not been sent yet.

You can have any number of vaults, each with its own people, shares and timer, and you can change a vault's beneficiaries while it is active.

## Live deployment

| | |
|---|---|
| Network | Arc mainnet (chain ID 5042) |
| App | https://frontend-eta-teal-52.vercel.app |
| VaultFactory | [`0x178909656B745aB483eD5585df4cEe68Dd715871`](https://explorer.arc.io/address/0x178909656B745aB483eD5585df4cEe68Dd715871) |
| Vault implementation | [`0x02f23A8bC9E606709572aa6eE46Fd30bc8886d3e`](https://explorer.arc.io/address/0x02f23A8bC9E606709572aa6eE46Fd30bc8886d3e) |
| USDC | `0x3600000000000000000000000000000000000000` |

Both contracts are source-verified on Sourcify ([factory](https://repo.sourcify.dev/5042/0x178909656B745aB483eD5585df4cEe68Dd715871), [vault](https://repo.sourcify.dev/5042/0x02f23A8bC9E606709572aa6eE46Fd30bc8886d3e)). Every vault is a minimal-proxy clone of the vault implementation.

The same code was first run on Arc testnet, where the factory is [`0xEc4d67B9e5C7D68AC21E12f81796aD9d072Dd720`](https://explorer.testnet.arc.io/address/0xEc4d67B9e5C7D68AC21E12f81796aD9d072Dd720#code). A vault there with a one-day window was paid out by the hosted keeper with no action from its owner or beneficiaries.

## Contracts

- `src/VaultFactory.sol` deploys one `Vault` implementation and creates each vault as a minimal-proxy clone of it. It indexes vaults by owner and by beneficiary.
- `src/Vault.sol` holds one vault's USDC, beneficiaries, timer and history.

Things worth knowing before you rely on it:

- **No admin.** There is no owner role on the factory, no upgrade path, no pause and no fee. After deployment nobody but a vault's owner can move its funds, and only the contract's rules decide when beneficiaries are paid.
- **Payout is permissionless.** Once a vault's deadline has passed, anyone can call `distribute()`, and it can only send each beneficiary their fixed share. A keeper does this automatically, and beneficiaries can do it themselves from the app, so payout never depends on one service.
- **One bad address can't block the rest.** If a transfer to a beneficiary fails, that share is held in the vault for them to collect later and everyone else is still paid.
- **Limits.** The check-in window is 1 day to 10 years, the grace period up to 1 year. A beneficiary can't be the owner, the vault, the token or the factory. Shares are basis points and must total 100%.
- **History on-chain.** Each vault records its own actions, so the app needs no indexer.
- **Arc only.** Both contracts refuse to deploy on any chain other than Arc mainnet.

## Security

Legatum Arca has **not been audited**, and a vault is **not a legal will**. Use amounts you could afford to lose.

What has been done: 59 Hardhat tests covering the full lifecycle, including re-entrancy and failed-transfer cases; a Slither pass with no high-severity findings; re-entrancy guards on every function that moves funds; and a testnet run of each release before mainnet.

Risks the contract can't remove:

- Anyone holding the owner's key can withdraw everything.
- A beneficiary who loses their key loses their share. Check every address before you fund a vault.
- If you forget to check in, the vault pays out. The app can add each deadline to your calendar; there are no email or message reminders yet.
- The hosted keeper runs once a day, so an automatic payout can arrive up to about a day after the deadline.

## Run it locally

Requires Node.js 18 or newer.

```bash
npm install
npm test                # contract tests

# full stack against a local chain
npm run node            # terminal 1: Hardhat node on chain ID 5042
npm run deploy:local    # terminal 2: MockUSDC + factory, mints test USDC
cd frontend && npm install && npm run dev:local
```

Open http://localhost:5173 and connect a wallet pointed at `http://127.0.0.1:8545` (chain ID 5042). The local chain reuses Arc mainnet's chain ID so the contracts' chain check runs unchanged, which means your wallet can't tell the two apart: check its RPC before signing. The account dialog has a button that mints test USDC.

`npm run dev` in `frontend/` targets Arc testnet instead. A production build (`npm run build`) targets mainnet.

## Deploy

Copy `.env.example` to `.env` and fill it in, then:

```bash
npm run deploy:arc
```

The script refuses any network but Arc mainnet, writes the factory address to `frontend/src/deployedMainnet.js`, and publishes both contracts' source through Sourcify (`script/verify-sourcify.js`).

### Keeper

`frontend/api/keeper.js` is a Vercel cron function that pays out vaults whose timer has run out. Its wallet only pays gas and has no special rights. It needs `KEEPER_NETWORK` (`mainnet` or `testnet`), `KEEPER_PRIVATE_KEY` and `CRON_SECRET` in the Vercel project. The same pass can be run by hand:

```bash
npm run keeper:mainnet -- --once
```

It skips vaults holding less than 1 USDC and pays at most 25 vaults per pass, largest first, so that spam vaults can't drain its gas or crowd out real ones.

## Layout

```
src/                 Vault.sol, VaultFactory.sol, test-only mocks
test/                Hardhat tests
script/              deploy.js (mainnet), deploy-testnet.js, deploy-local.js, keeper.js
frontend/
  src/components/    landing page and dashboard (React + ethers.js)
  api/keeper.js      daily payout cron
  lib/keeper.js      keeper logic shared with script/keeper.js
docs/                original planning notes
```

The files in `docs/` are the planning notes the project started from. They describe an earlier design (a single beneficiary who claims) and have not been kept up to date; the contracts and this README are the reference.

## License

MIT
