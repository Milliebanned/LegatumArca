require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const ARC_RPC_URL = process.env.ARC_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  paths: {
    sources: "./src",
  },
  networks: {
    // Local network mirrors Arc mainnet's chain ID (5042) so the on-chain
    // "Arc mainnet only" checks in VaultFactory/Vault behave the same in
    // tests as they will in production. No other network is configured.
    hardhat: {
      chainId: 5042,
    },
    arc: {
      url: ARC_RPC_URL || "https://rpc.mainnet.arc.io",
      chainId: 5042,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Staging only — see script/deploy-testnet.js and memory.md Decision 8.
    // The contracts themselves still hardcode a single CHAIN_ID; this
    // network entry is just RPC plumbing, not a chain-abstraction feature.
    arcTestnet: {
      url: "https://rpc.testnet.arc.io",
      chainId: 5042002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
