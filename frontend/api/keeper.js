// Vercel cron entry point for the payout keeper (schedule in vercel.json).
// On the Hobby plan Vercel runs it once a day, at some point within the
// scheduled hour; beneficiaries can always trigger a due payout sooner from
// the app.
//
// Environment (Vercel project settings):
//   KEEPER_PRIVATE_KEY  wallet that pays gas for distribute() (holds a few USDC)
//   KEEPER_NETWORK      "testnet" or "mainnet"
//   FACTORY_ADDRESS     optional override; defaults to src/deployedMainnet.js or
//                       src/deployedTestnet.js for the chosen network
//   CRON_SECRET         Vercel sends it as a bearer token on cron calls; any
//                       other caller is refused, so strangers can't spend the
//                       keeper's gas.
import { keeperWallet, runKeeperPass } from "../lib/keeper.js";
import testnetDeployment from "../src/deployedTestnet.js";
import mainnetDeployment from "../src/deployedMainnet.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const network = process.env.KEEPER_NETWORK || "testnet";
  const deployed = network === "mainnet" ? mainnetDeployment : testnetDeployment;
  const factoryAddress = process.env.FACTORY_ADDRESS || deployed.factory;
  if (!factoryAddress || /^0x0{40}$/.test(factoryAddress)) {
    return res.status(500).json({ error: `FACTORY_ADDRESS is not set for ${network}` });
  }

  try {
    const wallet = keeperWallet({ network, privateKey: process.env.KEEPER_PRIVATE_KEY });
    const result = await runKeeperPass({ wallet, factoryAddress, log: console.log });
    console.log(`keeper ${network}: checked ${result.checked}, distributed ${result.distributed.length}`);
    return res.status(200).json({ network, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.shortMessage ?? err.message });
  }
}
