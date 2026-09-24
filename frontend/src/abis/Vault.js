export const VAULT_ABI = [
  "function owner() view returns (address)",
  "function name() view returns (string)",
  "function getBeneficiaries() view returns (address[] beneficiaries, uint256[] shares)",
  "function beneficiaryCount() view returns (uint256)",
  "function shareOf(address) view returns (uint256)",
  "function owed(address) view returns (uint256)",
  "function shareValue(address) view returns (uint256)",
  "function distributedPool() view returns (uint256)",
  "function isDue() view returns (bool)",
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
  "function distribute() external",
  "function withdrawOwed() external",
  "function withdraw(uint256 amount) external",
  "function setBeneficiaries(address[] beneficiaries, uint256[] shares) external",
  "function historyLength() view returns (uint256)",
  "function getHistory(uint256 from, uint256 count) view returns (tuple(uint8 action, uint64 timestamp, address actor, uint256 amount)[])",
  "function cancel() external",
  "event Deposited(address indexed owner, uint256 amount)",
  "event CheckedIn(address indexed owner, uint256 newDeadline)",
  "event Distributed(uint256 pool, address indexed caller)",
  "event Paid(address indexed beneficiary, uint256 amount)",
  "event PayoutFailed(address indexed beneficiary, uint256 amount)",
  "event OwedWithdrawn(address indexed beneficiary, uint256 amount)",
  "event Withdrawn(address indexed owner, uint256 amount)",
  "event Cancelled(address indexed owner)",
];

// Mirrors the Vault.State enum in src/Vault.sol.
export const VAULT_STATE = ["Active", "Due", "Distributed", "Cancelled"];

// Mirrors the Vault.Action enum (history entry kinds) in src/Vault.sol.
export const VAULT_ACTION = [
  "Created",
  "BeneficiariesSet",
  "Deposit",
  "Withdraw",
  "CheckIn",
  "Payout",
  "PayoutFailed",
  "Cancel",
];

// Vault.TOTAL_SHARES: shares are basis points, 10_000 = 100%.
export const TOTAL_SHARES = 10000;
export const MAX_BENEFICIARIES = 10;
