// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Board.sol";
import "../Common/Ownable.sol";
import "./IOcean.sol";
import "../ERC20/IERC20.sol";

contract BoardFactory is Ownable {
    address public tolToken;
    uint256 public minimumTOLRequired;
    uint256 public baseFee;

    IOcean public ocean;
    uint256 public launchpadCount;

    event LaunchpadCreated(
        uint256 indexed id,
        address launchpadAddress,
        uint256 minBuy,
        uint256 maxBuy,
        uint256 deadline,
        uint256 targetRaised,
        string cid
    );

    constructor(
        address _tolToken,
        uint256 _baseFee,
        uint256 _minimumTOLRequired
    ) {
        tolToken = _tolToken;
        baseFee = _baseFee;
        minimumTOLRequired = _minimumTOLRequired;
    }

    function updateOceanInstance(address _ocean) external onlyOwner {
        ocean = IOcean(_ocean);
    }

    function createLaunchpad(
        address _fundedToken,
        uint256 _minBuy,
        uint256 _maxBuy,
        uint256 _rates,
        uint256 _startSale,
        uint256 _deadline,
        uint256 _targetRaised,
        uint256 _rewardRatePerTOL,
        string memory _cid,
        uint256 _allocation
    ) public payable returns (uint256) {
        require(msg.value >= baseFee, "Not enough fee");
        require(_minBuy > 0 && _maxBuy > _minBuy, "Invalid buy limits");

        launchpadCount++;
        Board newLaunchpad = new Board(
            msg.sender,
            tolToken,
            _fundedToken,
            minimumTOLRequired,
            _minBuy,
            _maxBuy,
            _rates,
            _deadline,
            _targetRaised,
            _rewardRatePerTOL,
            _cid
        );

        uint256 id = ocean.storeProject(
            msg.sender,
            address(newLaunchpad),
            _cid
        );

        IERC20(_fundedToken).transferFrom(
            msg.sender,
            address(newLaunchpad),
            _allocation
        );
        newLaunchpad.setStartDate(_startSale);

        emit LaunchpadCreated(
            launchpadCount,
            address(newLaunchpad),
            _minBuy,
            _maxBuy,
            _deadline,
            _targetRaised,
            _cid
        );

        return id;
    }

    function setBaseFee(uint256 value) external onlyOwner returns (bool) {
        baseFee = value;
        return true;
    }

    function setTOLRequired(uint256 value) external onlyOwner returns (bool) {
        minimumTOLRequired = value;
        return true;
    }
}
