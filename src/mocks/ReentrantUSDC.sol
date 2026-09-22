// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only token that attempts to re-enter the vault's claim() from
///      inside transfer(), simulating a malicious/compromised token. Used to
///      prove double-claims are impossible even if the token misbehaves.
///      Real USDC has no such callback; this exists purely to exercise the
///      nonReentrant guard and CEI ordering in Vault.claim().
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
            (bool reentered, ) = attackTarget.call(abi.encodeWithSignature("claim()"));
            require(!reentered, "reentrant claim must not succeed");
        }
        return super.transfer(to, amount);
    }
}
