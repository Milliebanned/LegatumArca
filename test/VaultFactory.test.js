const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VaultFactory", function () {
  const INTERVAL = 90 * 24 * 60 * 60; // 90 days
  const GRACE = 7 * 24 * 60 * 60; // 7 days

  async function deployFactory() {
    const [, , usdcHolder] = await ethers.getSigners();
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const Factory = await ethers.getContractFactory("VaultFactory");
    const factory = await Factory.deploy(await usdc.getAddress());
    return { factory, usdc, usdcHolder };
  }

  it("deploys only on Arc mainnet (chainId 1329)", async function () {
    const network = await ethers.provider.getNetwork();
    expect(network.chainId).to.equal(1329n);
  });

  it("creates a vault clone and initializes it", async function () {
    const { factory } = await deployFactory();
    const [owner, beneficiary] = await ethers.getSigners();

    const tx = await factory
      .connect(owner)
      .createVault(beneficiary.address, INTERVAL, GRACE);
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "VaultCreated");

    expect(event).to.not.be.undefined;
    const vaultAddress = event.args.vault;
    expect(vaultAddress).to.not.equal(ethers.ZeroAddress);

    const Vault = await ethers.getContractFactory("Vault");
    const vault = Vault.attach(vaultAddress);
    expect(await vault.owner()).to.equal(owner.address);
    expect(await vault.beneficiary()).to.equal(beneficiary.address);
    expect(await vault.checkInInterval()).to.equal(INTERVAL);
    expect(await vault.gracePeriod()).to.equal(GRACE);
    expect(await vault.state()).to.equal(0); // Active

    expect(await factory.vaults(owner.address)).to.equal(vaultAddress);
  });

  it("reverts on a second vault for the same owner", async function () {
    const { factory } = await deployFactory();
    const [owner, beneficiary, other] = await ethers.getSigners();

    await factory.connect(owner).createVault(beneficiary.address, INTERVAL, GRACE);
    await expect(
      factory.connect(owner).createVault(other.address, INTERVAL, GRACE)
    ).to.be.revertedWith("One vault per owner");
  });

  it("reverts on zero-address beneficiary", async function () {
    const { factory } = await deployFactory();
    const [owner] = await ethers.getSigners();
    await expect(
      factory.connect(owner).createVault(ethers.ZeroAddress, INTERVAL, GRACE)
    ).to.be.revertedWith("Invalid beneficiary");
  });

  it("reverts if beneficiary equals owner", async function () {
    const { factory } = await deployFactory();
    const [owner] = await ethers.getSigners();
    await expect(
      factory.connect(owner).createVault(owner.address, INTERVAL, GRACE)
    ).to.be.revertedWith("Beneficiary cannot be owner");
  });

  it("reverts on zero check-in interval", async function () {
    const { factory } = await deployFactory();
    const [owner, beneficiary] = await ethers.getSigners();
    await expect(
      factory.connect(owner).createVault(beneficiary.address, 0, GRACE)
    ).to.be.revertedWith("Interval must be > 0");
  });

  it("tracks vaultCount and getAllVaults across multiple owners", async function () {
    const { factory } = await deployFactory();
    const [ownerA, ownerB, beneficiary] = await ethers.getSigners();

    await factory.connect(ownerA).createVault(beneficiary.address, INTERVAL, GRACE);
    await factory.connect(ownerB).createVault(beneficiary.address, INTERVAL, GRACE);

    expect(await factory.vaultCount()).to.equal(2);
    const all = await factory.getAllVaults();
    expect(all.length).to.equal(2);
    expect(all[0]).to.equal(await factory.vaults(ownerA.address));
    expect(all[1]).to.equal(await factory.vaults(ownerB.address));
  });

  it("reverts factory deployment with zero USDC address", async function () {
    const Factory = await ethers.getContractFactory("VaultFactory");
    await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid USDC address"
    );
  });
});
