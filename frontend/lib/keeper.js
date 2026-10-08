// Payout keeper core, shared by the Vercel cron function (api/keeper.js) and
// the command-line keeper (script/keeper.js at the repo root).
//
// One pass: walk the factory's vaults and call distribute() on those whose
// timer has run out. distribute() is open to anyone, so the keeper
// holds no special rights; its wallet only pays gas and never touches vault
// funds. If a pass is missed, the next one (or a beneficiary pressing "Pay
// Out Now" in the app) still pays out.
import { ethers } from "ethers";

export const NETWORKS = {
  testnet: { rpc: "https://rpc.testnet.arc.io", chainId: 5042002 },
  mainnet: { rpc: "https://rpc.mainnet.arc.io", chainId: 5042 },
};

const FACTORY_ABI = [
  "function vaultCount() view returns (uint256)",
  "function getVaults(uint256 from, uint256 count) view returns (address[])",
];
const VAULT_ABI = [
  "function isDue() view returns (bool)",
  "function balance() view returns (uint256)",
  "function name() view returns (string)",
  "function distribute()",
  "event Paid(address indexed beneficiary, uint256 amount)",
  "event PayoutFailed(address indexed beneficiary, uint256 amount)",
];

export function keeperWallet({ network, privateKey, rpcUrl }) {
  const config = NETWORKS[network];
  if (!config) throw new Error(`Unknown network "${network}". Use testnet or mainnet.`);
  if (!privateKey) throw new Error("No keeper private key configured.");
  const provider = new ethers.JsonRpcProvider(rpcUrl || config.rpc, config.chainId, { staticNetwork: true });
  return new ethers.Wallet(privateKey, provider);
}

// Anyone can create vaults, and a payout costs this wallet gas, so one pass
// is bounded on every axis a stranger could push on:
//   minBalance   vaults holding less are left for their beneficiaries to pay
//                out from the app, so dust vaults can't be used to burn gas
//   maxPayouts   payouts per pass, largest vaults first, so junk can't crowd
//                out a real one
//   budgetMs     time spent scanning; a pass that runs out stops there
//   startAt      where in the factory's list the scan starts. It wraps
//                around, so rotating it between passes reaches every vault
//                even when one pass can't.
export const DEFAULTS = { minBalance: 1_000_000n, maxPayouts: 25, budgetMs: 35_000, pageSize: 200, parallel: 40 };

// Returns { total, checked, complete, distributed: [{ vault, name, paid, held,
// tx }], skipped, errors, wallet: { address, balance } }.
export async function runKeeperPass({ wallet, factoryAddress, log = () => {}, startAt = 0, ...overrides }) {
  const { minBalance, maxPayouts, budgetMs, pageSize, parallel } = { ...DEFAULTS, ...overrides };
  const started = Date.now();
  const outOfTime = () => Date.now() - started > budgetMs;

  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, wallet);
  const total = Number(await factory.vaultCount());
  const distributed = [];
  const errors = [];
  const due = [];
  let checked = 0;

  const first = total ? startAt % total : 0;
  scan: for (let seen = 0; seen < total; ) {
    const from = (first + seen) % total;
    // A page that would run past the end stops there; the next one wraps.
    const page = await factory.getVaults(from, Math.min(pageSize, total - seen, total - from));
    seen += page.length;
    if (page.length === 0) break;

    for (let i = 0; i < page.length; i += parallel) {
      if (outOfTime()) break scan;
      const batch = page.slice(i, i + parallel);
      const checks = await Promise.allSettled(
        batch.map(async (address) => {
          const vault = new ethers.Contract(address, VAULT_ABI, wallet);
          const [isDue, balance] = await Promise.all([vault.isDue(), vault.balance()]);
          return { address, isDue, balance };
        })
      );
      checked += batch.length;
      checks.forEach((c, j) => {
        if (c.status === "rejected") {
          errors.push({ vault: batch[j], error: c.reason?.shortMessage ?? c.reason?.message });
        } else if (c.value.isDue && c.value.balance >= minBalance) {
          due.push(c.value);
        }
      });
    }
  }

  // Largest first, and one at a time, from one wallet. The nonce is counted
  // here rather than asked for before each send: the provider caches that
  // answer for a moment, which on a fast chain hands two payouts the same one.
  let nonce = due.length ? await wallet.getNonce("pending") : 0;
  due.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  for (const { address } of due.slice(0, maxPayouts)) {
    const vault = new ethers.Contract(address, VAULT_ABI, wallet);
    const name = await vault.name().catch(() => "");
    try {
      const tx = await vault.distribute({ nonce });
      nonce += 1;
      const receipt = await tx.wait();
      const events = receipt.logs.map((l) => {
        try {
          return vault.interface.parseLog(l);
        } catch {
          return null;
        }
      });
      const result = {
        vault: address,
        name,
        paid: events.filter((e) => e?.name === "Paid").length,
        held: events.filter((e) => e?.name === "PayoutFailed").length,
        tx: receipt.hash,
      };
      distributed.push(result);
      log(`distributed "${name}" ${address}: ${result.paid} paid, ${result.held} held (tx ${result.tx})`);
    } catch (err) {
      // Someone else (a beneficiary, another keeper run) may have got there first.
      errors.push({ vault: address, error: err.shortMessage ?? err.message });
      log(`distribute failed for ${address}: ${err.shortMessage ?? err.message}`);
    }
  }

  // What's left to pay gas with (Arc's gas token is USDC, 18 decimals as the
  // native balance), so whoever reads the result can top the wallet up in time.
  const balance = await wallet.provider.getBalance(wallet.address).catch(() => null);

  return {
    total,
    checked,
    complete: checked >= total,
    distributed,
    skipped: Math.max(0, due.length - maxPayouts),
    errors,
    wallet: { address: wallet.address, balance: balance === null ? null : ethers.formatEther(balance) },
  };
}
