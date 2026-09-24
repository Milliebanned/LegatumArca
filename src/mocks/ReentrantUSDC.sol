// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only token that attempts to re-enter the vault's distribute()
///      from inside transfer(), simulating a malicious/compromised token. Used
///      to prove a vault can't be paid out twice even if the token misbehaves.
///      Real USDC has no such callback; this exists purely to exercise the
///      nonReentrant guard and CEI ordering in Vault.distribute().
contract ReentrantUSDC is ERC20 {
    address public attackTarget;
    bool public armed;

    constructor() ERC20("Reentrant USDC", "RUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address vault) external {
        attackTarget = vault;
        armed = true;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (armed) {
            armed = false; // one attempt only, avoid infinite recursion
            (bool reentered, ) = attackTarget.call(abi.encodeWithSignature("distribute()"));
            require(!reentered, "reentrant distribute must not succeed");
        }
        return super.transfer(to, amount);
    }
}
