// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only token modelling USDC's blacklist: transfers to a blacklisted
///      address revert. Used to prove one unpayable beneficiary doesn't block
///      the rest of a vault's distribution.
contract BlacklistUSDC is ERC20 {
    mapping(address => bool) public blacklisted;

    constructor() ERC20("Blacklist USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setBlacklisted(address account, bool value) external {
        blacklisted[account] = value;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blacklisted[to], "Blacklisted");
        super._update(from, to, value);
    }
}
