// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Common/Ownable.sol";
import "../ERC20/IERC20.sol";
import "../Math/SafeMath.sol";

contract Ocean is Ownable {
    using SafeMath for uint256;

    struct Project {
        address owner;
        string cid;
        uint256 boostPoint;
        bool isTerminated;
    }

    mapping(address => Project) public projects;
    mapping(address => uint256) public totalAllocation;
    mapping(address => uint256) public allocated;
    uint256 public projectCount;
    uint256 public boostRate;

    // Events for various project actions
    event ProjectStored(
        address indexed owner,
        address contractAddress,
        string cid
    );
    event ProjectUpdated(address indexed ca, string cid);
    event ProjectTerminated(address indexed ca);
    event ProjectBoosted(
        address indexed ca,
        address booster,
        uint256 newBoostPoints
    );

    address public factoryAddress;
    address public nxpAddress;
    address public treasuryAddress;

    modifier onlyProjectOwner(address _ca) {
        require(
            projects[_ca].owner == msg.sender,
            "Only the project owner can call this function"
        );
        _;
    }

    modifier onlyFactory() {
        require(
            msg.sender == factoryAddress,
            "Only the factory can call this function"
        );
        _;
    }

    modifier onlyBoard() {
        require(projects[msg.sender].owner != address(0), "");
        _;
    }

    /**
     * @dev Constructor to initialize the contract
     * @param factory Address of the factory contract
     * @param token Address of the TOL token contract
     */
    constructor(address factory, address token, address _treasuryAddress) {
        factoryAddress = factory;
        nxpAddress = token;
        treasuryAddress = _treasuryAddress;
    }

    /**
     * @dev Update boost rate point
     * @param amount The amount of the boost rate to update
     */
    function setBoostRate(uint256 amount) external onlyOwner {
        boostRate = amount;
    }

    /**
     * @dev Stores a new project in the contract
     * @param _owner Address of the project owner
     * @param _ca Address of the project's contract
     * @param _cid IPFS CID of the project's information
     */
    function storeProject(
        address _owner,
        address _ca,
        string memory _cid,
        uint256 _totalAllocation
    ) external onlyFactory returns (bool) {
        projects[_ca] = Project({
            owner: _owner,
            cid: _cid,
            boostPoint: 0,
            isTerminated: false
        });
        totalAllocation[_ca] = _totalAllocation;
        allocated[_ca] = 0;

        emit ProjectStored(msg.sender, _ca, _cid);

        return true;
    }

    /**
     * @dev Updates the CID of an existing project
     * @param _ca The ID of the project to update
     * @param newCid The new IPFS CID for the project's information
     */
    function updateProject(
        address _ca,
        string memory newCid
    ) external onlyProjectOwner(_ca) {
        require(!projects[_ca].isTerminated, "Project is terminated");

        projects[_ca].cid = newCid;
        emit ProjectUpdated(_ca, newCid);
    }

    /**
     * @dev Terminates a project
     * @param _ca The ID of the project to terminate
     */
    function terminateProject(address _ca) external onlyOwner {
        require(!projects[_ca].isTerminated, "Project is already terminated");

        projects[_ca].isTerminated = true;
        emit ProjectTerminated(_ca);
    }

    /**
     * @dev Boosts a project by spending TOL tokens
     * @param _ca The ID of the project to boost
     * @param _nxpAmount The amount of TOL tokens to spend on boosting
     */
    function boostProject(address _ca, uint256 _nxpAmount) external {
        require(!projects[_ca].isTerminated, "Project is terminated");
        require(_nxpAmount > 0, "NXP amount cannot be zero");

        IERC20(nxpAddress).transferFrom(
            msg.sender,
            treasuryAddress,
            _nxpAmount
        );

        uint256 boosted = _nxpAmount.div(10 ** 18) / boostRate;
        projects[_ca].boostPoint += boosted;

        emit ProjectBoosted(_ca, msg.sender, projects[_ca].boostPoint);
    }

    /**
     * @dev Update allocated of launchpad to keep tracking
     * @param amount amount of token
     * @param add added or not
     */
    function updateAllocated(uint256 amount, bool add) external onlyBoard {
        if (add) {
            allocated[msg.sender] += amount;
        } else {
            allocated[msg.sender] -= amount;
        }
    }

    /**
     * @dev Fallback function to reject direct payments
     */
    receive() external payable {
        revert("This contract does not accept direct payments");
    }
}
