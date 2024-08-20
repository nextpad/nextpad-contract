// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Common/Ownable.sol";
import "../ERC20/IERC20.sol";
import "./IOcean.sol";

contract Board is Ownable {
    enum Status {
        Pending,
        Active,
        Cancelled,
        Failed,
        Finalized
    }

    struct Launchpad {
        Status status;
        uint256 minBuy;
        uint256 maxBuy;
        uint256 maxAllocation;
        uint256 rates;
        uint256 deadline;
        string cid;
        uint256 totalRaised;
        uint256 targetRaised;
        uint256 totalNXPPlaced;
    }

    uint32 public totalContributors;
    mapping(address => uint256) public nxpContributions;
    mapping(address => uint256) public allocation;
    address[] public voters;

    IERC20 public nxpToken;
    IERC20 public fundedToken;
    IOcean public ocean;

    uint256 public startDate;
    uint256 public minimumNXPRequired;
    uint256 public minimumHoldTime;
    uint256 public rewardRatePerNXP;

    Launchpad public launchpad;

    event PresaleBought(address buyer, uint256 amount);
    event TokenWithdrawal(address buyer, uint256 amount);
    event EmergencyWithdraw(address buyer, uint256 amount);
    event Refund(address buyer, uint256 amount);
    event PresaleCancelled();
    event PresaleFinalized(uint256 totalRaised);
    event NXPPlaced(address placer, uint256 amount);

    /**
     * @dev Initializes the contract with the provided parameters and sets the initial state of the launchpad.
     * @param data1 address array of data
     * @param data2 uint array of data
     * @param _cid The content identifier for additional launchpad information.
     */
    constructor(
        // data1[0] _owner,
        // data1[1] _nxpToken,
        // data1[2] _fundedToken,
        // data1[3] _ocean,

        // data2[0] _minimumNXPRequired,
        // data2[1] _minBuy,
        // data2[2] _maxBuy,
        // data2[3] _rates,
        // data2[4] _deadline,
        // data2[5] _targetRaised,
        // data2[6] _rewardRatePerNXP,
        // data2[7] _startDate,
        // data2[8] _maxAllocation,

        address[4] memory data1,
        uint256[9] memory data2,
        string memory _cid
    ) {
        transferOwnership(data1[0]);
        nxpToken = IERC20(data1[1]);
        fundedToken = IERC20(data1[2]);
        ocean = IOcean(data1[3]);

        minimumNXPRequired = data2[0];
        minimumHoldTime = nxpToken.minimumHoldingTime();

        launchpad.status = Status.Pending;
        launchpad.minBuy = data2[1];
        launchpad.maxBuy = data2[2];
        launchpad.rates = data2[3];
        launchpad.deadline = data2[4];
        launchpad.targetRaised = data2[5];
        launchpad.cid = _cid;
        launchpad.maxAllocation = data2[8];
        rewardRatePerNXP = data2[6];
        startDate = data2[7];
    }

    /**
     * @dev Returns the contribution amount for a specified address.
     * @param target The address to query the contribution for.
     * @return The contribution amount in ETH.
     */
    function getAllocation(address target) external view returns (uint256) {
        return allocation[target];
    }

    function getRates() external view returns (uint256) {
        return launchpad.rates;
    }

    /**
     * @dev Returns the total number of voters who have placed TOL tokens.
     * @return The number of voters.
     */
    function totalVoters() external view returns (uint256) {
        return voters.length;
    }

    /**
     * @dev Calculates and returns the token amount for a specified address based on their contribution.
     * @param target The address to query the token amount for.
     * @return The token amount.
     */
    function getTokenAmount(address target) public view returns (uint256) {
        return allocation[target];
    }

    /**
     * @dev Returns the details of the current launchpad.
     * @return The launchpad status, minBuy, maxBuy, rates, deadline, cid, totalRaised, targetRaised, and totalNXPPlaced.
     */
    function getLaunchpadDetail()
        external
        view
        returns (
            Status,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            string memory,
            uint256,
            uint256,
            uint256
        )
    {
        return (
            launchpad.status,
            launchpad.minBuy,
            launchpad.maxBuy,
            launchpad.rates,
            startDate,
            launchpad.deadline,
            launchpad.cid,
            launchpad.totalRaised,
            launchpad.targetRaised,
            launchpad.totalNXPPlaced
        );
    }

    /**
     * @dev Allows users to participate in the presale by sending ETH.
     * Emits a {PresaleBought} event.
     */
    function buyPresale() external payable {
        require(block.timestamp >= startDate, "Presale has not started yet");
        require(launchpad.status == Status.Active, "Presale is not active");
        require(block.timestamp < launchpad.deadline, "Presale has ended");
        require(
            msg.value >= launchpad.minBuy && msg.value <= launchpad.maxBuy,
            "Invalid amount"
        );
        require(
            launchpad.totalRaised + msg.value <= launchpad.targetRaised,
            "Exceeds target raised reached"
        );
        uint256 amount = msg.value * launchpad.rates;
        require(
            allocation[msg.sender] + amount <= launchpad.maxAllocation,
            "Exceeds max allocation"
        );

        launchpad.totalRaised += msg.value;
        allocation[msg.sender] += amount;
        totalContributors += 1;
        ocean.updateAllocated(amount, true);

        emit PresaleBought(msg.sender, msg.value);
    }

    /**
     * @dev Allows users to withdraw their tokens after the presale has been finalized.
     * Emits a {TokenWithdrawal} event.
     */
    function withdrawToken() external {
        require(
            launchpad.status == Status.Finalized,
            "Presale is not finalized"
        );

        uint256 tokenAmount = getTokenAmount(msg.sender);
        fundedToken.transfer(msg.sender, tokenAmount);

        emit TokenWithdrawal(msg.sender, tokenAmount);
    }

    /**
     * @dev Allows users to get a refund of their contribution if the presale failed.
     * Emits a {Refund} event.
     */
    function refund() external {
        require(launchpad.status == Status.Failed, "Presale is not failed");
        uint256 amount = allocation[msg.sender] / launchpad.rates;
        require(amount > 0, "No contribution found");

        payable(msg.sender).transfer(amount);

        emit Refund(msg.sender, amount);
    }

    /**
     * @dev Allows users to withdraw their contribution in case of an emergency during an active presale.
     * Emits an {EmergencyWithdraw} event.
     */
    function emergencyWithdraw() external {
        require(launchpad.status == Status.Active, "Presale is not active");
        uint256 amount = allocation[msg.sender] / launchpad.rates;
        require(amount > 0, "No contribution found");

        allocation[msg.sender] = 0;
        launchpad.totalRaised -= amount;
        totalContributors -= 1;
        ocean.updateAllocated(allocation[msg.sender], false);

        payable(msg.sender).transfer(amount);

        emit EmergencyWithdraw(msg.sender, amount);
    }

    /**
     * @dev Allows the owner to cancel the presale if it is either pending or active.
     * Emits a {PresaleCancelled} event.
     */
    function cancelPresale() external onlyOwner {
        require(
            launchpad.status == Status.Active ||
                launchpad.status == Status.Pending,
            "Cannot cancel"
        );
        launchpad.status = Status.Cancelled;

        emit PresaleCancelled();
    }

    /**
     * @dev Finalizes the presale if it is active and the deadline has passed.
     * If the total raised amount is less than the target, the presale fails.
     * Otherwise, the presale is finalized and rewards are distributed.
     * Emits a {PresaleFinalized} event.
     */
    function finalizePresale() external onlyOwner {
        require(launchpad.status == Status.Active, "Presale is not active");
        require(block.timestamp >= launchpad.deadline, "Presale has not ended");

        if (launchpad.totalRaised < launchpad.targetRaised) {
            launchpad.status = Status.Failed;
        } else {
            launchpad.status = Status.Finalized;
            payable(owner()).transfer(launchpad.totalRaised);

            uint256 totalVoter = voters.length;
            for (uint256 i = 0; i < totalVoter; i++) {
                fundedToken.transfer(
                    voters[i],
                    nxpContributions[voters[i]] * rewardRatePerNXP
                );
            }
        }

        emit PresaleFinalized(launchpad.totalRaised);
    }

    /**
     * @dev Allows users to place NXP tokens into the launchpad if it is pending.
     * The user's NXP token holding time must meet the minimum requirement.
     * Emits a {NXPPlaced} event.
     * @param _amount The amount of NXP tokens to place.
     */
    function voteProject(uint256 _amount) external {
        require(block.timestamp >= startDate, "Presale has not started yet");
        require(launchpad.status == Status.Pending, "Launchpad is not pending");
        uint256 firstHold = nxpToken.getHoldingTime(msg.sender);
        require(
            block.timestamp >= firstHold + minimumHoldTime,
            "NXP hold time not met"
        );
        require(_amount >= 20e18, "The amount is not enough");
        uint256 amountAdded = nxpContributions[msg.sender] + _amount;
        require(
            amountAdded <= (minimumNXPRequired * 50) / 100,
            "Exceeds maximum allocation per voters"
        );

        nxpToken.transferFrom(msg.sender, address(this), _amount);
        nxpContributions[msg.sender] += _amount;
        launchpad.totalNXPPlaced += _amount;
        voters.push(msg.sender);

        if (launchpad.totalNXPPlaced >= minimumNXPRequired) {
            launchpad.status = Status.Active;
        }

        emit NXPPlaced(msg.sender, _amount);
    }

    /**
     * @dev Fallback function to prevent direct ETH transfers to the contract.
     */
    receive() external payable {
        revert("Do not send ETH directly");
    }
}
