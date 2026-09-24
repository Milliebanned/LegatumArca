// Command-line payout keeper: runs the same pass as the Vercel cron function
// (frontend/api/keeper.js), either once or on a loop. Handy for testing a
// short-timer vault on testnet without waiting for the daily cron.
//
// Usage:
//   node script/keeper.js --network testnet            # polls forever
//   node script/keeper.js --network testnet --once     # one pass, then exit
//   node script/keeper.js --network mainnet
//
// Env (.env): KEEPER_PRIVATE_KEY, optional KEEPER_INTERVAL_SECONDS (default
// 30). Mainnet also needs FACTORY_ADDRESS.
require("dotenv").config();
const fs = require("fs");
const path = require("path");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function factoryAddress(network) {
  if (process.env.FACTORY_ADDRESS) return process.env.FACTORY_ADDRESS;
  if (network === "testnet") {
    // Written by script/deploy-testnet.js.
    const file = path.join(__dirname, "..", "frontend", "src", "deployedTestnet.js");
    const match = fs.readFileSync(file, "utf8").match(/factory:\s*"(0x[0-9a-fA-F]{40})"/);
    if (match) return match[1];
  }
  throw new Error(`No factory address for ${network}. Set FACTORY_ADDRESS in .env.`);
}

const log = (...parts) => console.log(new Date().toISOString(), ...parts);

async function main() {
  const { keeperWallet, runKeeperPass } = await import("../frontend/lib/keeper.js");
  const network = arg("network") ?? "testnet";
  const once = process.argv.includes("--once");
  const wallet = keeperWallet({
    network,
    privateKey: process.env.KEEPER_PRIVATE_KEY,
    rpcUrl: network === "mainnet" ? process.env.ARC_RPC_URL : undefined,
  });
  const factory = factoryAddress(network);
  const intervalMs = Number(process.env.KEEPER_INTERVAL_SECONDS || 30) * 1000;

  log(`keeper on ${network}, factory ${factory}, wallet ${wallet.address}`);

  do {
    try {
      const { checked, distributed } = await runKeeperPass({ wallet, factoryAddress: factory, log });
      if (distributed.length > 0 || once) log(`checked ${checked} vaults, distributed ${distributed.length}`);
    } catch (err) {
      log(`pass failed: ${err.shortMessage ?? err.message}`);
    }
    if (once) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (true);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
