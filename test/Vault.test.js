const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("./utils/time");

describe("Vault", function () {
  const INTERVAL = 90 * 24 * 60 * 60; // 90 days
  const GRACE = 7 * 24 * 60 * 60; // 7 days
  const DEADLINE = INTERVAL + GRACE;
  const DEPOSIT = ethers.parseUnits("100", 6);

  async function setup() {
    const [owner, beneficiary, stranger] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.mint(owner.address, ethers.parseUnits("1000", 6));

    const Factory = await ethers.getContractFactory("VaultFactory");
    const factory = await Factory.deploy(await usdc.getAddress());

    await factory.connect(owner).createVault(beneficiary.address, INTERVAL, GRACE);
    const vaultAddress = await factory.vaults(owner.address);
    const Vault = await ethers.getContractFactory("Vault");
    const vault = Vault.attach(vaultAddress);

    return { owner, beneficiary, stranger, usdc, factory, vault };
  }

  async function setupAndDeposit() {
    const ctx = await setup();
    await ctx.usdc.connect(ctx.owner).approve(await ctx.vault.getAddress(), DEPOSIT);
    await ctx.vault.connect(ctx.owner).deposit(DEPOSIT);
    return ctx;
  }

  describe("initialization", function () {
    it("starts in Active state with lastCheckInTime = now", async function () {
      const { vault } = await setup();
      expect(await vault.state()).to.equal(0); // Active
      const latest = await time.latest();
      expect(await vault.lastCheckInTime()).to.be.closeTo(latest, 5);
    });

    it("cannot be initialized twice", async function () {
      const { vault, owner, beneficiary } = await setup();
      await expect(
        vault.connect(owner).initialize(owner.address, beneficiary.address, INTERVAL, GRACE)
      ).to.be.revertedWith("Already initialized");
    });

    it("locks the bare implementation contract against initialize()", async function () {
      const { usdc } = await setup();
      const Vault = await ethers.getContractFactory("Vault");
      const impl = await Vault.deploy(await usdc.getAddress());
      const [, , stranger, other] = await ethers.getSigners();
      await expect(
        impl.initialize(stranger.address, other.address, INTERVAL, GRACE)
      ).to.be.revertedWith("Already initialized");
    });
  });

  describe("deposit", function () {
    it("increases vault balance on deposit", async function () {
      const { vault, owner, usdc } = await setup();
      await usdc.connect(owner).approve(await vault.getAddress(), DEPOSIT);
      await expect(vault.connect(owner).deposit(DEPOSIT))
        .to.emit(vault, "Deposited")
        .withArgs(owner.address, DEPOSIT);
      expect(await vault.balance()).to.equal(DEPOSIT);
    });

    it("reverts if a non-owner tries to deposit", async function () {
      const { vault, beneficiary } = await setup();
      await expect(vault.connect(beneficiary).deposit(DEPOSIT)).to.be.revertedWith(
        "Only owner"
      );
    });
  });

  describe("checkIn", function () {
    it("resets lastCheckInTime and stays Active", async function () {
      const { vault, owner } = await setup();
      await time.increase(INTERVAL / 2);
      await vault.connect(owner).checkIn();
      const latest = await time.latest();
      expect(await vault.lastCheckInTime()).to.be.closeTo(latest, 5);
      expect(await vault.state()).to.equal(0); // Active
    });

    it("reverts if a non-owner tries to check in", async function () {
      const { vault, beneficiary } = await setup();
      await expect(vault.connect(beneficiary).checkIn()).to.be.revertedWith("Only owner");
    });

    it("allows check-in one second before the deadline", async function () {
      const { vault, owner } = await setup();
      await time.increase(DEADLINE - 1);
      await expect(vault.connect(owner).checkIn()).to.not.be.reverted;
      expect(await vault.state()).to.equal(0); // Active
    });

    it("pulls the vault back from Claimable to Active", async function () {
      const { vault, owner } = await setupAndDeposit();
      await time.increase(DEADLINE + 1);
      await vault.updateState();
      expect(await vault.state()).to.equal(1); // Claimable

      await vault.connect(owner).checkIn();
      expect(await vault.state()).to.equal(0); // Active
    });
  });

  describe("claim", function () {
    it("reverts before the deadline", async function () {
      const { vault, beneficiary } = await setupAndDeposit();
      await time.increase(DEADLINE - 10);
      await expect(vault.connect(beneficiary).claim()).to.be.revertedWith(
        "Vault not claimable yet"
      );
    });

    it("transfers full balance to beneficiary after the deadline", async function () {
      const { vault, beneficiary, usdc } = await setupAndDeposit();
      await time.increase(DEADLINE + 1);

      const before = await usdc.balanceOf(beneficiary.address);
      await expect(vault.connect(beneficiary).claim())
        .to.emit(vault, "Claimed")
        .withArgs(beneficiary.address, DEPOSIT);
      const after = await usdc.balanceOf(beneficiary.address);

      expect(after - before).to.equal(DEPOSIT);
      expect(await vault.state()).to.equal(2); // Claimed
    });

    it("allows claim exactly one second after the deadline", async function () {
      const { vault, beneficiary } = await setupAndDeposit();
      await time.increase(DEADLINE + 1);
      await expect(vault.connect(beneficiary).claim()).to.not.be.reverted;
    });

    it("reverts a second claim attempt (already Claimed)", async function () {
      const { vault, beneficiary } = await setupAndDeposit();
      await time.increase(DEADLINE + 1);
      await vault.connect(beneficiary).claim();
      await expect(vault.connect(beneficiary).claim()).to.be.revertedWith(
        "Vault not claimable yet"
      );
    });

    it("reverts if caller is not the beneficiary", async function () {
      const { vault, stranger } = await setupAndDeposit();
      await time.increase(DEADLINE + 1);
      await expect(vault.connect(stranger).claim()).to.be.revertedWith("Only beneficiary");
    });

    it("reverts if there is nothing to claim", async function () {
      const { vault, beneficiary } = await setup(); // no deposit
      await time.increase(DEADLINE + 1);
      await expect(vault.connect(beneficiary).claim()).to.be.revertedWith(
        "No funds to claim"
      );
    });
  });

  describe("withdraw", function () {
    it("lets the owner withdraw part of the balance while active", async function () {
      const { vault, owner, usdc } = await setupAndDeposit();
      const before = await usdc.balanceOf(owner.address);
      const partial = ethers.parseUnits("40", 6);
      await expect(vault.connect(owner).withdraw(partial))
        .to.emit(vault, "Withdrawn")
        .withArgs(owner.address, partial);
      expect((await usdc.balanceOf(owner.address)) - before).to.equal(partial);
      expect(await vault.balance()).to.equal(DEPOSIT - partial);
    });

    it("reverts if a non-owner tries to withdraw", async function () {
      const { vault, beneficiary } = await setupAndDeposit();
      await expect(
        vault.connect(beneficiary).withdraw(ethers.parseUnits("1", 6))
      ).to.be.revertedWith("Only owner");
    });

    it("reverts once the vault is cancelled", async function () {
      const { vault, owner } = await setupAndDeposit();
      await vault.connect(owner).cancel();
      await expect(vault.connect(owner).withdraw(ethers.parseUnits("1", 6))).to.be.revertedWith(
        "Vault not active"
      );
    });
  });

  describe("cancel", function () {
    it("returns full balance to owner and sets state to Cancelled", async function () {
      const { vault, owner, usdc } = await setupAndDeposit();
      const before = await usdc.balanceOf(owner.address);
      await expect(vault.connect(owner).cancel())
        .to.emit(vault, "Cancelled")
        .withArgs(owner.address);
      expect((await usdc.balanceOf(owner.address)) - before).to.equal(DEPOSIT);
      expect(await vault.state()).to.equal(3); // Cancelled
      expect(await vault.balance()).to.equal(0);
    });

    it("reverts if a non-owner tries to cancel", async function () {
      const { vault, beneficiary } = await setupAndDeposit();
      await expect(vault.connect(beneficiary).cancel()).to.be.revertedWith("Only owner");
    });
  });

  describe("view helpers", function () {
    it("timeUntilDeadline counts down and floors at 0", async function () {
      const { vault } = await setup();
      const remaining = await vault.timeUntilDeadline();
      expect(remaining).to.be.closeTo(BigInt(DEADLINE), 5n);

      await time.increase(DEADLINE + 100);
      expect(await vault.timeUntilDeadline()).to.equal(0);
    });

    it("getVaultState reflects Claimable without a transaction", async function () {
      const { vault } = await setupAndDeposit();
      expect(await vault.getVaultState()).to.equal(0); // Active
      await time.increase(DEADLINE + 1);
      expect(await vault.getVaultState()).to.equal(1); // Claimable, computed live
      expect(await vault.state()).to.equal(0); // storage not yet updated
    });
  });

  describe("reentrancy", function () {
    it("blocks a reentrant claim() attempted from inside the token transfer", async function () {
      const [owner, beneficiary] = await ethers.getSigners();

      const ReentrantUSDC = await ethers.getContractFactory("ReentrantUSDC");
      const token = await ReentrantUSDC.deploy();
      await token.mint(owner.address, DEPOSIT);

      const Factory = await ethers.getContractFactory("VaultFactory");
      const factory = await Factory.deploy(await token.getAddress());
      await factory.connect(owner).createVault(beneficiary.address, INTERVAL, GRACE);
      const vaultAddress = await factory.vaults(owner.address);
      const Vault = await ethers.getContractFactory("Vault");
      const vault = Vault.attach(vaultAddress);

      await token.connect(owner).approve(vaultAddress, DEPOSIT);
      await vault.connect(owner).deposit(DEPOSIT);
      await time.increase(DEADLINE + 1);

      // Arm the token so its transfer() re-enters claim() once, from the
      // beneficiary's own claim call (msg.sender stays the beneficiary).
      await token.connect(beneficiary).arm(vaultAddress);

      await expect(vault.connect(beneficiary).claim())
        .to.emit(vault, "Claimed")
        .withArgs(beneficiary.address, DEPOSIT);

      // Exactly one payout reached the beneficiary — no double-claim.
      expect(await token.balanceOf(beneficiary.address)).to.equal(DEPOSIT);
      expect(await vault.state()).to.equal(2); // Claimed
    });
  });
});
