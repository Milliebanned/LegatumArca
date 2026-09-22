import localDeployment from "./deployedLocal.js";

// Arc mainnet configuration — hardcoded, not configurable. No chain
// selection UI, no fallback chains, no other network is ever considered.
// See docs/ARCHITECTURE.md "Arc Mainnet Integration".
const MAINNET_CONFIG = {
  chainId: 1329,
  rpcUrl: "https://rpc.arc.io",
  // Fill in after `npx hardhat run script/deploy.js --network arc`.
  factoryAddress: "0x0000000000000000000000000000000000000000",
  usdcAddress: "0x0000000000000000000000000000000000000000",
};

// import.meta.env.DEV is a Vite build-time constant (true only for `npm run
// dev`, always false in `npm run build`) — this is not a runtime toggle a
// user can flip, just which fixed address set gets compiled into the app.
export const ARC_CONFIG = import.meta.env.DEV
  ? { ...MAINNET_CONFIG, factoryAddress: localDeployment.factory, usdcAddress: localDeployment.usdc }
  : MAINNET_CONFIG;

export const IS_LOCAL_DEV = import.meta.env.DEV;
