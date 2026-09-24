const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VaultFactory", function () {
  const INTERVAL = 90 * 24 * 60 * 60; // 90 days
  const GRACE = 7 * 24 * 60 * 60; // 7 days

  async function deployFactory() {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const Factory = await ethers.getContractFactory("VaultFactory");
    const factory = await Factory.deploy(await usdc.getAddress());
    return { factory, usdc };
  }

  function parseCreated(factory, receipt) {
    return receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "VaultCreated");
  }

  it("deploys only on Arc mainnet (chainId 5042)", async function () {
    const network = await ethers.provider.getNetwork();
    expect(network.chainId).to.equal(5042n);
  });

  it("creates a vault clone and initializes it", async function () {
    const { factory } = await deployFactory();
    const [owner, b1, b2] = await ethers.getSigners();

    const tx = await factory
      .connect(owner)
      .createVault("Kids", [b1.address, b2.address], [6000, 4000], INTERVAL, GRACE);
    const event = parseCreated(factory, await tx.wait());

    expect(event).to.not.be.undefined;
    const vaultAddress = event.args.vault;
    expect(vaultAddress).to.not.equal(ethers.ZeroAddress);
    expect(event.args.name).to.equal("Kids");
    expect(event.args.beneficiaries).to.deep.equal([b1.address, b2.address]);

    const Vault = await ethers.getContractFactory("Vault");
    const vault = Vault.attach(vaultAddress);
    expect(await vault.owner()).to.equal(owner.address);
    expect(await vault.name()).to.equal("Kids");
    expect(await vault.shareOf(b1.address)).to.equal(6000);
    expect(await vault.shareOf(b2.address)).to.equal(4000);
    expect(await vault.checkInInterval()).to.equal(INTERVAL);
    expect(await vault.gracePeriod()).to.equal(GRACE);
    expect(await vault.state()).to.equal(0); // Active

    expect(await factory.getVaultsByOwner(owner.address)).to.deep.equal([vaultAddress]);
    expect(await factory.getVaultsByBeneficiary(b1.address)).to.deep.equal([vaultAddress]);
    expect(await factory.getVaultsByBeneficiary(b2.address)).to.deep.equal([vaultAddress]);
  });

  it("lets one owner create several independent vaults", async function () {
    const { factory } = await deployFactory();
    const [owner, b1, b2] = await ethers.getSigners();

    await factory.connect(owner).createVault("Spouse", [b1.address], [10000], INTERVAL, GRACE);
    await factory
      .connect(owner)
      .createVault("Kids", [b1.address, b2.address], [5000, 5000], INTERVAL * 2, 0);

    const mine = await factory.getVaultsByOwner(owner.address);
    expect(mine.length).to.equal(2);
    expect(mine[0]).to.not.equal(mine[1]);
    expect(await factory.getVaultsByBeneficiary(b1.address)).to.deep.equal([...mine]);
    expect(await factory.getVaultsByBeneficiary(b2.address)).to.deep.equal([mine[1]]);

    const Vault = await ethers.getContractFactory("Vault");
    expect(await Vault.attach(mine[1]).checkInInterval()).to.equal(INTERVAL * 2);
  });

  describe("rejects invalid beneficiary setups", function () {
    let factory, owner, b1, b2;
    beforeEach(async function () {
      ({ factory } = await deployFactory());
      [owner, b1, b2] = await ethers.getSigners();
    });

    const cases = [
      ["no beneficiaries", () => [[], []], "1 to 10 beneficiaries"],
      ["mismatched shares", () => [[b1.address, b2.address], [10000]], "Shares length mismatch"],
      ["zero address", () => [[ethers.ZeroAddress], [10000]], "Invalid beneficiary"],
      ["owner as beneficiary", () => [[owner.address], [10000]], "Beneficiary cannot be owner"],
      ["duplicate", () => [[b1.address, b1.address], [5000, 5000]], "Duplicate beneficiary"],
      ["zero share", () => [[b1.address, b2.address], [10000, 0]], "Share must be > 0"],
      ["shares under 100%", () => [[b1.address, b2.address], [5000, 4000]], "Shares must total 100%"],
      ["shares over 100%", () => [[b1.address, b2.address], [6000, 5000]], "Shares must total 100%"],
    ];

    for (const [label, args, reason] of cases) {
      it(label, async function () {
        const [addrs, shares] = args();
        await expect(
          factory.connect(owner).createVault("x", addrs, shares, INTERVAL, GRACE)
        ).to.be.revertedWith(reason);
      });
    }

    it("more than 10 beneficiaries", async function () {
      const addrs = Array.from({ length: 11 }, () => ethers.Wallet.createRandom().address);
      const shares = Array(11).fill(0);
      shares[0] = 10000;
      await expect(
        factory.connect(owner).createVault("x", addrs, shares, INTERVAL, GRACE)
      ).to.be.revertedWith("1 to 10 beneficiaries");
    });

    it("a name longer than 64 bytes", async function () {
      await expect(
        factory.connect(owner).createVault("x".repeat(65), [b1.address], [10000], INTERVAL, GRACE)
      ).to.be.revertedWith("Name too long");
    });
  });

  it("reverts on zero check-in interval", async function () {
    const { factory } = await deployFactory();
    const [owner, b1] = await ethers.getSigners();
    await expect(
      factory.connect(owner).createVault("x", [b1.address], [10000], 0, GRACE)
    ).to.be.revertedWith("Interval must be > 0");
  });

  it("tracks vaultCount and getAllVaults across multiple owners", async function () {
    const { factory } = await deployFactory();
    const [ownerA, ownerB, beneficiary] = await ethers.getSigners();

    await factory.connect(ownerA).createVault("A", [beneficiary.address], [10000], INTERVAL, GRACE);
    await factory.connect(ownerB).createVault("B", [beneficiary.address], [10000], INTERVAL, GRACE);

    expect(await factory.vaultCount()).to.equal(2);
    const all = await factory.getAllVaults();
    expect(all.length).to.equal(2);
    expect(all[0]).to.equal((await factory.getVaultsByOwner(ownerA.address))[0]);
    expect(all[1]).to.equal((await factory.getVaultsByOwner(ownerB.address))[0]);
  });

  it("reverts factory deployment with zero USDC address", async function () {
    const Factory = await ethers.getContractFactory("VaultFactory");
    await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith("Invalid USDC address");
  });
});
