const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFactory", function () {
   let tokenFactory;
   let owner, addr1, treasury;

   beforeEach(async function () {
      [owner, addr1, treasury] = await ethers.getSigners();
      const TokenFactory = await ethers.getContractFactory("TokenFactory");
      tokenFactory = await TokenFactory.deploy(treasury.address);

      // Set the base fee for creating a token
      const baseFee = ethers.parseEther("1");
      await tokenFactory.setBaseFee(baseFee);
   });

   it("should create a token", async function () {
      const name = "One Top";
      const symbol = "OT";
      const initialSupply = ethers.parseEther("1000");

      const tBalance = await ethers.provider.getBalance(treasury.address);

      // Create a token
      await tokenFactory.createToken(name, symbol, initialSupply, {
         value: ethers.parseEther("1"),
      });

      // Get the address of the created token from the emitted event
      const filter = tokenFactory.filters.TokenCreated();
      const events = await tokenFactory.queryFilter(filter);
      const tokenAddress = events[0].args.tokenAddress;

      const token = await ethers.getContractAt("ERC20Token", tokenAddress);
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
      expect(tBalance).below(
         await ethers.provider.getBalance(treasury.address)
      );
   });

   it("should not create a token with zero fee", async function () {
      const name = "One Top";
      const symbol = "OT";
      const initialSupply = ethers.parseEther("1000");

      // Create a token
      await expect(
         tokenFactory.createToken(name, symbol, initialSupply)
      ).to.be.revertedWith("Fee not enough");
   });

   it("should set new base fee", async function () {
      const newFee = ethers.parseEther("2");
      await tokenFactory.setBaseFee(newFee);

      const baseFee = await tokenFactory.baseFee();
      expect(baseFee).to.equal(ethers.parseEther("2"));
   });
});
