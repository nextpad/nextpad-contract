// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOcean {
    /**
     * @dev Verifies and updates the certification status of a project
     * @param _input Encoded input containing project ID and certification status
     * @return bool Returns true if the verification was successful
     */
    function verify(bytes calldata _input) external returns (bool);

    /**
     * @dev Boosts a project by spending TOL tokens
     * @param _ca The ID of the project to boost
     * @param _tolAmount The amount of TOL tokens to spend on boosting
     */
    function boostProject(address _ca, uint256 _tolAmount) external;

    /**
     * @dev Terminates a project
     * @param _ca The ID of the project to terminate
     */
    function terminateProject(address _ca) external;

    /**
     * @dev Stores a new project in the contract
     * @param _owner Address of the project owner
     * @param _cid IPFS CID of the project's information
     */
    function storeProject(
        address _owner,
        address _ca,
        string memory _cid,
        uint256 _totalAllocation
    ) external returns (bool);

    /**
     * @dev Update allocated of launchpad to keep tracking
     * @param amount amount of token
     * @param add added or not
     */
    function updateAllocated(uint256 amount, bool add) external;
}
