// Minimal local stand-in for @nomicfoundation/hardhat-network-helpers' `time`
// module. Written locally because the installed hardhat-toolbox@7 line pairs
// with Hardhat 3, while this project pins Hardhat 2 — pulling in the real
// package would drag in a conflicting peer dependency for two functions.
const { ethers } = require("hardhat");

async function latest() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}

async function increase(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
  return latest();
}

module.exports = { time: { latest, increase } };
