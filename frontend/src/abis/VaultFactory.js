export const VAULT_FACTORY_ABI = [
  "function createVault(address beneficiary, uint256 checkInInterval, uint256 gracePeriod) external returns (address)",
  "function vaults(address owner) view returns (address)",
  "function vaultCount() view returns (uint256)",
  "function getAllVaults() view returns (address[])",
  "event VaultCreated(address indexed owner, address indexed vault, address beneficiary, uint256 checkInInterval, uint256 gracePeriod)",
];
