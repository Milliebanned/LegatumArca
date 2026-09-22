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
    // Local network mirrors Arc mainnet's chain ID (1329) so the on-chain
    // "Arc mainnet only" checks in VaultFactory/Vault behave the same in
    // tests as they will in production. No other network is configured.
    hardhat: {
      chainId: 1329,
    },
    arc: {
      url: ARC_RPC_URL,
      chainId: 1329,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
