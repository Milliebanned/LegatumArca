import localDeployment from "./deployedLocal.js";
import testnetDeployment from "./deployedTestnet.js";
import mainnetDeployment from "./deployedMainnet.js";

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
  // Arc's gas token is USDC, so that's what the wallet should show as native.
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  // Written by `npm run deploy:arc` (script/deploy.js).
  factoryAddress: mainnetDeployment.factory,
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

// Which network gets compiled in is decided once, at build/serve time, by
// import.meta.env.VITE_ARC_TARGET ("local" | "testnet" | "mainnet") — never a
// runtime toggle a user can reach. If unset, the dev server (`npm run dev`)
// targets Arc testnet, and any production build (`npm run build`) targets
// mainnet, so a build only ever points somewhere else if that was
// deliberately configured for that specific deployment. The local Hardhat
// node is opt-in via `npm run dev:local`.
const TARGETS = ["local", "testnet", "mainnet"];
const TARGET = TARGETS.includes(import.meta.env.VITE_ARC_TARGET)
  ? import.meta.env.VITE_ARC_TARGET
  : import.meta.env.DEV
    ? "testnet"
    : "mainnet";

// Local Hardhat node. hardhat.config.js pins it to chain ID 5042 so the
// contracts' "Arc mainnet only" require() passes — which means a wallet cannot
// tell this chain apart from real Arc mainnet by chain ID alone. The RPC URL
// therefore has to be stated explicitly: inheriting MAINNET_CONFIG's rpcUrl
// here (as this config used to) hands the wallet the real Arc mainnet endpoint
// and asks for real mainnet transactions against addresses that only exist on
// the local node. Native currency is the local node's ETH, not Arc's USDC.
const LOCAL_CONFIG = {
  ...MAINNET_CONFIG,
  rpcUrl: "http://127.0.0.1:8545",
  blockExplorerUrl: "",
  label: "Local Hardhat",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  factoryAddress: localDeployment.factory,
  usdcAddress: localDeployment.usdc,
};

export const ARC_CONFIG =
  TARGET === "local" ? LOCAL_CONFIG : TARGET === "testnet" ? TESTNET_CONFIG : MAINNET_CONFIG;

export const IS_LOCAL_DEV = TARGET === "local";
export const IS_TESTNET_BUILD = TARGET === "testnet";
