// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Board.sol";
import "../Common/Ownable.sol";
import "./IOcean.sol";
import "../ERC20/IERC20.sol";

contract BoardFactory is Ownable {
    address public nxpToken;
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
        address _nxpToken,
        uint256 _baseFee,
        uint256 _minimumTOLRequired
    ) {
        nxpToken = _nxpToken;
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
        uint256 _allocation,
        uint256 _maxAllocation
    ) public payable returns (bool) {
        require(msg.value >= baseFee, "Not enough fee");
        require(_minBuy > 0 && _maxBuy > _minBuy, "Invalid buy limits");

        launchpadCount++;
        Board newLaunchpad = new Board(
            [msg.sender, nxpToken, _fundedToken, address(ocean)],
            [
                minimumTOLRequired,
                _minBuy,
                _maxBuy,
                _rates,
                _deadline,
                _targetRaised,
                _rewardRatePerTOL,
                _startSale,
                _maxAllocation
            ],
            _cid
        );

        ocean.storeProject(
            msg.sender,
            address(newLaunchpad),
            _cid,
            _allocation
        );

        IERC20(_fundedToken).transferFrom(
            msg.sender,
            address(newLaunchpad),
            _allocation
        );

        emit LaunchpadCreated(
            launchpadCount,
            address(newLaunchpad),
            _minBuy,
            _maxBuy,
            _deadline,
            _targetRaised,
            _cid
        );

        return true;
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
