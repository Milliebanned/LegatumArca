// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Vault.sol";

/// @title VaultFactory
/// @notice Deploys the single Vault implementation and mints minimal-proxy
///         clones of it, one per owner. Arc mainnet only — the constructor
///         reverts on any other chain, with no override.
contract VaultFactory {
    // Arc mainnet chain ID. Never configurable, never overridden.
    uint256 public constant CHAIN_ID = 1329;

    address public immutable vaultImplementation;
    address public immutable usdc;

    mapping(address => address) public vaults; // owner => vault address
    address[] public allVaults;

    event VaultCreated(
        address indexed owner,
        address indexed vault,
        address beneficiary,
        uint256 checkInInterval,
        uint256 gracePeriod
    );

    /// @param usdcAddress USDC token address on Arc mainnet.
    constructor(address usdcAddress) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        require(chainId == CHAIN_ID, "This contract only deploys on Arc mainnet (1329)");
        require(usdcAddress != address(0), "Invalid USDC address");

        usdc = usdcAddress;
        vaultImplementation = address(new Vault(usdcAddress));
    }

    /// @dev Creates a new vault for the caller. One vault per owner.
    /// @param beneficiary Address that can claim funds if the owner goes inactive.
    /// @param checkInInterval Seconds between required check-ins.
    /// @param gracePeriod Additional seconds of buffer before the beneficiary can claim.
    function createVault(
        address beneficiary,
        uint256 checkInInterval,
        uint256 gracePeriod
    ) external returns (address) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(beneficiary != msg.sender, "Beneficiary cannot be owner");
        require(checkInInterval > 0, "Interval must be > 0");
        require(vaults[msg.sender] == address(0), "One vault per owner");

        address vault = Clones.clone(vaultImplementation);
        Vault(vault).initialize(msg.sender, beneficiary, checkInInterval, gracePeriod);

        vaults[msg.sender] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault, beneficiary, checkInInterval, gracePeriod);
        return vault;
    }

    /// @dev Total number of vaults created.
    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    /// @dev All vault addresses ever created, in creation order.
    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }
}
