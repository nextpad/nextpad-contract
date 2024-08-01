// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Token is ERC20, Ownable {
    /**
     * @dev Constructor that gives `receiver` all of the initial tokens and sets the name and symbol of the token.
     * @param receiver The address that will receive the initial supply of tokens.
     * @param name The name of the token.
     * @param symbol The symbol of the token.
     * @param initialSupply The total initial supply of tokens.
     */
    constructor(
        address receiver,
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(receiver, initialSupply);
    }

    /**
     * @dev Function to mint new tokens.
     * Can only be called by the owner of the contract.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

contract TokenFactory is Ownable {
    uint256 public baseFee;
    address public treasury;

    /**
     * @dev Constructor that sets the treasury address where the fees will be sent.
     * @param _treasury The address of the treasury.
     */
    constructor(address _treasury) Ownable(msg.sender) {
        treasury = _treasury;
    }

    event TokenCreated(address tokenAddress);

    /**
     * @dev Function to create a new ERC20 token.
     * The sender must pay a fee that is at least the base fee.
     * The new token's ownership will be transferred to the sender.
     * @param name The name of the new token.
     * @param symbol The symbol of the new token.
     * @param initialSupply The total initial supply of the new token.
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) public payable returns (address) {
        require(msg.value >= baseFee, "Fee not enough");

        // Create a new ERC20 token
        ERC20Token newToken = new ERC20Token(
            msg.sender,
            name,
            symbol,
            initialSupply
        );
        newToken.transferOwnership(msg.sender);

        payable(treasury).transfer(msg.value);

        emit TokenCreated(address(newToken));

        return address(newToken);
    }

    /**
     * @dev Function to set the base fee for creating a new token.
     * Can only be called by the owner of the contract.
     * @param value The new base fee value.
     * @return A boolean indicating whether the operation succeeded.
     */
    function setBaseFee(uint256 value) external onlyOwner returns (bool) {
        baseFee = value;
        return true;
    }
}
