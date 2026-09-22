export const VAULT_ABI = [
  "function owner() view returns (address)",
  "function beneficiary() view returns (address)",
  "function checkInInterval() view returns (uint256)",
  "function gracePeriod() view returns (uint256)",
  "function lastCheckInTime() view returns (uint256)",
  "function state() view returns (uint8)",
  "function getVaultState() view returns (uint8)",
  "function deadlineTime() view returns (uint256)",
  "function timeUntilDeadline() view returns (uint256)",
  "function balance() view returns (uint256)",
  "function deposit(uint256 amount) external",
  "function checkIn() external",
  "function claim() external",
  "function withdraw(uint256 amount) external",
  "function cancel() external",
  "event Deposited(address indexed owner, uint256 amount)",
  "event CheckedIn(address indexed owner, uint256 newDeadline)",
  "event Claimed(address indexed beneficiary, uint256 amount)",
  "event Withdrawn(address indexed owner, uint256 amount)",
  "event Cancelled(address indexed owner)",
];

// Mirrors the Vault.State enum in src/Vault.sol.
export const VAULT_STATE = ["Active", "Claimable", "Claimed", "Cancelled"];
