// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Vault.sol";

/// @title VaultFactory
/// @notice Deploys the single Vault implementation and mints minimal-proxy
///         clones of it. An owner can hold any number of vaults, each with its
///         own beneficiaries, shares and check-in timer. Arc mainnet only — the
///         constructor reverts on any other chain, with no override.
contract VaultFactory is IVaultRegistry {
    // Arc mainnet chain ID. Never configurable, never overridden.
    uint256 public constant CHAIN_ID = 5042;

    address public immutable vaultImplementation;
    address public immutable usdc;

    mapping(address => address[]) internal ownerVaults;
    mapping(address => address[]) internal beneficiaryVaults;
    mapping(address => mapping(address => bool)) internal isIndexed; // beneficiary => vault => listed
    mapping(address => bool) public isVault;
    address[] public allVaults;

    event VaultCreated(
        address indexed owner,
        address indexed vault,
        string name,
        address[] beneficiaries,
        uint256[] shares,
        uint256 checkInInterval,
        uint256 gracePeriod
    );

    /// @param usdcAddress USDC token address on Arc mainnet.
    constructor(address usdcAddress) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        require(chainId == CHAIN_ID, "This contract only deploys on Arc mainnet (5042)");
        require(usdcAddress != address(0), "Invalid USDC address");

        usdc = usdcAddress;
        vaultImplementation = address(new Vault(usdcAddress));
    }

    /// @dev Creates a new vault owned by the caller. Beneficiary and share
    ///      validation lives in Vault.initialize, which reverts the whole call.
    /// @param name Owner-chosen label (e.g. "Family"), at most 64 bytes.
    /// @param beneficiaries Addresses that can claim if the owner goes inactive.
    /// @param shares Basis points per beneficiary (same order); must total 10_000.
    /// @param checkInInterval Seconds between required check-ins.
    /// @param gracePeriod Additional seconds of buffer before beneficiaries can claim.
    function createVault(
        string calldata name,
        address[] calldata beneficiaries,
        uint256[] calldata shares,
        uint256 checkInInterval,
        uint256 gracePeriod
    ) external returns (address) {
        address vault = Clones.clone(vaultImplementation);
        Vault(vault).initialize(msg.sender, name, beneficiaries, shares, checkInInterval, gracePeriod);

        isVault[vault] = true;
        ownerVaults[msg.sender].push(vault);
        _index(vault, beneficiaries);
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault, name, beneficiaries, shares, checkInInterval, gracePeriod);
        return vault;
    }

    /// @dev Called by a vault after its owner changes beneficiaries, so newly
    ///      added people can find it. Removed beneficiaries stay listed; check
    ///      Vault.shareOf before treating an indexed vault as theirs.
    function registerBeneficiaries(address[] calldata beneficiaries) external {
        require(isVault[msg.sender], "Only vaults");
        _index(msg.sender, beneficiaries);
    }

    function _index(address vault, address[] calldata beneficiaries) internal {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address b = beneficiaries[i];
            if (!isIndexed[b][vault]) {
                isIndexed[b][vault] = true;
                beneficiaryVaults[b].push(vault);
            }
        }
    }

    /// @dev Every vault `owner` has created, in creation order.
    function getVaultsByOwner(address owner) external view returns (address[] memory) {
        return ownerVaults[owner];
    }

    /// @dev Every vault that names or has named `beneficiary`, in the order
    ///      they were first named.
    function getVaultsByBeneficiary(address beneficiary) external view returns (address[] memory) {
        return beneficiaryVaults[beneficiary];
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
