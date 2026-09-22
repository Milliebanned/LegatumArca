// Deploys VaultFactory (and, inside its constructor, the single Vault
// implementation clones point at) to Arc mainnet.
//
// Arc mainnet only: VaultFactory's constructor itself reverts if the chain
// ID isn't 5042, so this script can't accidentally deploy anywhere else.
// There is no chain flag, no network switch beyond what's in hardhat.config.js.
//
// Usage:
//   npx hardhat run script/deploy.js --network arc
const { ethers, network } = require("hardhat");

async function main() {
  if (network.name !== "arc") {
    throw new Error(
      `Refusing to deploy on network "${network.name}". Use --network arc.`
    );
  }

  const usdcAddress = process.env.ARC_USDC_ADDRESS;
  if (!usdcAddress || usdcAddress === "") {
    throw new Error(
      "ARC_USDC_ADDRESS is not set. Fill it in from official Arc/Circle docs before deploying."
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Factory = await ethers.getContractFactory("VaultFactory");
  const factory = await Factory.deploy(usdcAddress);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const implAddress = await factory.vaultImplementation();

  console.log("VaultFactory deployed at:", factoryAddress);
  console.log("Vault implementation deployed at:", implAddress);
  console.log("USDC address used:", usdcAddress);
  console.log("\nRecord these addresses in README.md and the frontend config.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
