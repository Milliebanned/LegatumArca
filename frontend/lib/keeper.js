// Payout keeper core, shared by the Vercel cron function (api/keeper.js) and
// the command-line keeper (script/keeper.js at the repo root).
//
// One pass: read every vault from the factory and call distribute() on each
// one whose timer has run out. distribute() is open to anyone, so the keeper
// holds no special rights; its wallet only pays gas and never touches vault
// funds. If a pass is missed, the next one (or a beneficiary pressing "Pay
// Out Now" in the app) still pays out.
import { ethers } from "ethers";

export const NETWORKS = {
  testnet: { rpc: "https://rpc.testnet.arc.io", chainId: 5042002 },
  mainnet: { rpc: "https://rpc.mainnet.arc.io", chainId: 5042 },
};

const FACTORY_ABI = ["function getAllVaults() view returns (address[])"];
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

// Returns { checked, distributed: [{ vault, name, paid, held, tx }], errors: [...] }.
export async function runKeeperPass({ wallet, factoryAddress, log = () => {} }) {
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, wallet);
  const vaults = await factory.getAllVaults();
  const distributed = [];
  const errors = [];

  for (const address of vaults) {
    const vault = new ethers.Contract(address, VAULT_ABI, wallet);
    let due;
    let balance;
    try {
      [due, balance] = await Promise.all([vault.isDue(), vault.balance()]);
    } catch (err) {
      errors.push({ vault: address, error: err.shortMessage ?? err.message });
      continue;
    }
    // An empty vault past its deadline has nothing to send; leave it alone
    // rather than spend gas (the owner can still check in or deposit).
    if (!due || balance === 0n) continue;

    const name = await vault.name().catch(() => "");
    try {
      const receipt = await (await vault.distribute()).wait();
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

  return { checked: vaults.length, distributed, errors };
}
