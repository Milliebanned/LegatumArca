require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const ARC_RPC_URL = process.env.ARC_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  paths: {
    sources: "./src",
  },
  // Source verification on Arc's block explorer (Blockscout), so anyone can
  // read the contracts and an owner can check in from the explorer if the app
  // is ever unreachable. Blockscout needs no API key; the plugin wants one set.
  // This works on testnet. The mainnet explorer keeps its API behind a browser
  // check, so mainnet goes through Sourcify (script/verify-sourcify.js).
  etherscan: {
    apiKey: { arc: "blockscout", arcTestnet: "blockscout" },
    customChains: [
      {
        network: "arc",
        chainId: 5042,
        urls: { apiURL: "https://explorer.arc.io/api", browserURL: "https://explorer.arc.io" },
      },
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: { apiURL: "https://explorer.testnet.arc.io/api", browserURL: "https://explorer.testnet.arc.io" },
      },
    ],
  },
  // The plugin's Sourcify client still calls an API Sourcify has removed.
  // Mainnet sources are published with script/verify-sourcify.js instead.
  sourcify: { enabled: false },
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
