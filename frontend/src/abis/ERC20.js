export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// Local-dev-only extension (MockUSDC has a public mint()); never called
// against the real Arc USDC contract.
export const MOCK_ERC20_ABI = [...ERC20_ABI, "function mint(address to, uint256 amount) external"];
