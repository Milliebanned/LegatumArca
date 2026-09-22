import localDeployment from "./deployedLocal.js";
import testnetDeployment from "./deployedTestnet.js";

// Arc network configuration — hardcoded, not configurable at runtime. No
// chain-selection UI ever exists in the app; which of these objects gets
// compiled in is decided entirely at build time (see ARC_CONFIG below), the
// same way local-dev address swapping already worked before this file grew
// a testnet target. See docs/ARCHITECTURE.md "Arc Mainnet Integration" and
// memory.md Decision 8 for why a testnet build exists at all.
const MAINNET_CONFIG = {
  chainId: 5042,
  rpcUrl: "https://rpc.mainnet.arc.io",
  blockExplorerUrl: "https://explorer.arc.io",
  label: "Arc",
  // Fill in after `npx hardhat run script/deploy.js --network arc`.
  factoryAddress: "0x0000000000000000000000000000000000000000",
  // Circle's ERC-20 view over Arc's native USDC balance (Arc's gas token
  // *is* USDC; this is the standard-interface address for approve/transfer/
  // balanceOf, per docs.arc.io/arc/references/contract-addresses). Same
  // address on testnet and mainnet.
  usdcAddress: "0x3600000000000000000000000000000000000000",
};

const TESTNET_CONFIG = {
  ...MAINNET_CONFIG,
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.io",
  blockExplorerUrl: "https://explorer.testnet.arc.io",
  label: "Arc Testnet",
  factoryAddress: testnetDeployment.factory,
};

// import.meta.env.DEV is a Vite build-time constant (true only for `npm run
// dev`, always false in any `npm run build`) — never a runtime toggle a user
// can reach. import.meta.env.VITE_ARC_TARGET is likewise resolved once, at
// build time (e.g. by a Vercel project's environment variables), not read at
// runtime from the page. It defaults to "mainnet" — the safe choice — so a
// build only ever targets testnet if that was deliberately configured for
// that specific deployment.
const TARGET = import.meta.env.VITE_ARC_TARGET === "testnet" ? "testnet" : "mainnet";

export const ARC_CONFIG = import.meta.env.DEV
  ? { ...MAINNET_CONFIG, chainId: 5042, factoryAddress: localDeployment.factory, usdcAddress: localDeployment.usdc, label: "Local (Arc-pinned)" }
  : TARGET === "testnet"
    ? TESTNET_CONFIG
    : MAINNET_CONFIG;

export const IS_LOCAL_DEV = import.meta.env.DEV;
export const IS_TESTNET_BUILD = !import.meta.env.DEV && TARGET === "testnet";
