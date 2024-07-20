// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Locker
 * @dev A contract for locking up ERC20 tokens for a specified period of time.
 */
contract Locker is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    error InvalidParams(string param);
    error PermissionDenied();
    error AlreadyClaimed();
    error NotYetUnlocked();
    error InvalidPaginationParameters();

    event LockUpCreated(
        uint256 indexed lockUpId,
        address indexed token,
        address indexed receiver,
        uint256 amount,
        uint40 unlockTime
    );
    event TokensUnlocked(
        uint256 indexed lockUpId,
        address indexed token,
        address indexed receiver,
        uint256 amount
    );

    struct LockUp {
        address token;
        uint40 unlockTime;
        bool unlocked;
        uint256 amount;
        address receiver;
        string title;
    }

    LockUp[] public lockUps;
    EnumerableSet.AddressSet private tokens;
    EnumerableSet.AddressSet private receivers;

    uint256 private immutable MAX_PAGINATION_RANGE = 10000;

    modifier onlyReceiver(uint256 lockUpId) {
        if (msg.sender != lockUps[lockUpId].receiver) revert PermissionDenied();
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new lock-up.
     * @param token The address of the token being locked up.
     * @param amount The amount of tokens being locked up.
     * @param unlockTime The timestamp when the tokens can be unlocked.
     * @param receiver The address of the receiver of the locked tokens.
     * @param title The optional title of the lock-up.
     */
    function createLockUp(
        address token,
        uint256 amount,
        uint40 unlockTime,
        address receiver,
        string calldata title
    ) external whenNotPaused {
        if (token == address(0)) revert InvalidParams("token");
        if (amount == 0) revert InvalidParams("amount");
        if (unlockTime <= block.timestamp) revert InvalidParams("unlockTime");
        if (receiver == address(0)) revert InvalidParams("receiver");

        lockUps.push(
            LockUp({
                token: token,
                unlockTime: unlockTime,
                unlocked: false,
                amount: amount,
                receiver: receiver,
                title: title
            })
        );

        tokens.add(token);
        receivers.add(receiver);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit LockUpCreated(
            lockUps.length - 1,
            token,
            receiver,
            amount,
            unlockTime
        );
    }

    /**
     * @dev Unlocks the tokens of a lock-up.
     * @param lockUpId The ID of the lock-up.
     */
    function unlock(
        uint256 lockUpId
    ) external nonReentrant whenNotPaused onlyReceiver(lockUpId) {
        LockUp storage lockUp = lockUps[lockUpId];
        if (lockUp.unlocked) revert AlreadyClaimed();
        if (lockUp.unlockTime > block.timestamp) revert NotYetUnlocked();

        lockUp.unlocked = true;

        IERC20(lockUp.token).safeTransfer(lockUp.receiver, lockUp.amount);

        emit TokensUnlocked(
            lockUpId,
            lockUp.token,
            lockUp.receiver,
            lockUp.amount
        );
    }

    /**
     * @dev Returns the length of lockUps array.
     * @return The number of lock-ups.
     */
    function lockUpCount() external view returns (uint256) {
        return lockUps.length;
    }

    /**
     * @dev Returns an array of lock-up IDs for a given token address within a specified range.
     * @param token The address of the token.
     * @param start The starting index of the range.
     * @param stop The ending index of the range.
     * @return ids An array of lock-up IDs.
     */
    function getLockUpIdsByToken(
        address token,
        uint256 start,
        uint256 stop
    ) external view returns (uint256[] memory ids) {
        if (start >= stop || stop - start > MAX_PAGINATION_RANGE)
            revert InvalidPaginationParameters();

        uint256 lockUpsLength = lockUps.length;
        stop = stop > lockUpsLength ? lockUpsLength : stop;

        uint256 count;
        for (uint256 i = start; i < stop; ) {
            if (lockUps[i].token == token) ++count;
            unchecked {
                ++i;
            }
        }

        ids = new uint256[](count);
        uint256 j;
        for (uint256 i = start; i < stop; ) {
            if (lockUps[i].token == token) {
                ids[j++] = i;
                if (j == count) break;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Returns an array of lock-up IDs for a given receiver address within a specified range.
     * @param receiver The address of the receiver.
     * @param start The starting index of the range.
     * @param stop The ending index of the range.
     * @return ids An array of lock-up IDs.
     */
    function getLockUpIdsByReceiver(
        address receiver,
        uint256 start,
        uint256 stop
    ) external view returns (uint256[] memory ids) {
        if (start >= stop || stop - start > MAX_PAGINATION_RANGE)
            revert InvalidPaginationParameters();

        uint256 lockUpsLength = lockUps.length;
        stop = stop > lockUpsLength ? lockUpsLength : stop;

        uint256 count;
        for (uint256 i = start; i < stop; ) {
            if (lockUps[i].receiver == receiver) ++count;
            unchecked {
                ++i;
            }
        }

        ids = new uint256[](count);
        uint256 j;
        for (uint256 i = start; i < stop; ) {
            if (lockUps[i].receiver == receiver) {
                ids[j++] = i;
                if (j == count) break;
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Pauses the contract.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
