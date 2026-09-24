// Deploys VaultFactory (and, inside its constructor, the single Vault
// implementation clones point at) to Arc mainnet.
//
// Arc mainnet only: VaultFactory's constructor itself reverts if the chain
// ID isn't 5042, so this script can't accidentally deploy anywhere else.
// There is no chain flag, no network switch beyond what's in hardhat.config.js.
//
// Usage:
//   npx hardhat run script/deploy.js --network arc
const fs = require("fs");
const path = require("path");
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

  const deployTx = factory.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("VaultFactory deployed at:", factoryAddress);
  console.log("Vault implementation deployed at:", implAddress);
  console.log("USDC address used:", usdcAddress);
  console.log("Deploy tx:", receipt.hash, "block", receipt.blockNumber);

  // The app (frontend/src/config.js) and the keeper (frontend/api/keeper.js)
  // read the mainnet factory from here.
  const outPath = path.join(__dirname, "..", "frontend", "src", "deployedMainnet.js");
  fs.writeFileSync(
    outPath,
    `// Written by script/deploy.js after the Arc mainnet deployment
// (tx ${receipt.hash}, block ${receipt.blockNumber}).
export default {
  factory: "${factoryAddress}",
  vaultImplementation: "${implAddress}",
};
`
  );
  console.log("Wrote frontend/src/deployedMainnet.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
