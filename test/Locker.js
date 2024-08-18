const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Locker", function () {
   let Locker, locker, Token, token, owner, addr1, addr2;
   const ONE_DAY = 86400;
   const ONE_WEEK = ONE_DAY * 7;

   beforeEach(async function () {
      [owner, addr1, addr2] = await ethers.getSigners();

      // Deploy mock ERC20 token
      Token = await ethers.getContractFactory("NXPToken");
      token = await Token.deploy();

      // Deploy Locker contract
      Locker = await ethers.getContractFactory("Locker");
      locker = await Locker.deploy();

      // Mint some tokens to addr1
      await token.mint(addr1.address, ethers.parseEther("1000"));
      await token.connect(addr1).approve(locker.target, ethers.MaxUint256);
   });

   describe("Deployment", function () {
      it("Should set the right owner", async function () {
         expect(await locker.owner()).to.equal(owner.address);
      });
   });

   describe("Creating lock-ups", function () {
      it("Should create a lock-up successfully", async function () {
         const amount = ethers.parseEther("100");
         const unlockTime = Math.floor(Date.now() / 1000) + ONE_WEEK;

         await expect(
            locker
               .connect(addr1)
               .createLockUp(
                  token.target,
                  amount,
                  unlockTime,
                  addr1.address,
                  "Test Lock"
               )
         )
            .to.emit(locker, "LockUpCreated")
            .withArgs(0, token.target, addr1.address, amount, unlockTime);

         const lockUp = await locker.lockUps(0);
         expect(lockUp.token).to.equal(token.target);
         expect(lockUp.unlockTime).to.equal(unlockTime);
         expect(lockUp.unlocked).to.be.false;
         expect(lockUp.amount).to.equal(amount);
         expect(lockUp.receiver).to.equal(addr1.address);
         expect(lockUp.title).to.equal("Test Lock");
      });

      it("Should revert if token address is zero", async function () {
         const amount = ethers.parseEther("100");
         const unlockTime = Math.floor(Date.now() / 1000) + ONE_WEEK;

         await expect(
            locker
               .connect(addr1)
               .createLockUp(
                  ethers.ZeroAddress,
                  amount,
                  unlockTime,
                  addr1.address,
                  "Test Lock"
               )
         ).to.be.revertedWithCustomError(locker, "InvalidParams");
      });

      it("Should revert if amount is zero", async function () {
         const unlockTime = Math.floor(Date.now() / 1000) + ONE_WEEK;

         await expect(
            locker
               .connect(addr1)
               .createLockUp(
                  token.target,
                  0,
                  unlockTime,
                  addr1.address,
                  "Test Lock"
               )
         ).to.be.revertedWithCustomError(locker, "InvalidParams");
      });

      it("Should revert if unlock time is in the past", async function () {
         const amount = ethers.parseEther("100");
         const unlockTime = Math.floor(Date.now() / 1000) - ONE_DAY;

         await expect(
            locker
               .connect(addr1)
               .createLockUp(
                  token.target,
                  amount,
                  unlockTime,
                  addr1.address,
                  "Test Lock"
               )
         ).to.be.revertedWithCustomError(locker, "InvalidParams");
      });

      it("Should revert if receiver address is zero", async function () {
         const amount = ethers.parseEther("100");
         const unlockTime = Math.floor(Date.now() / 1000) + ONE_WEEK;

         await expect(
            locker
               .connect(addr1)
               .createLockUp(
                  token.target,
                  amount,
                  unlockTime,
                  ethers.ZeroAddress,
                  "Test Lock"
               )
         ).to.be.revertedWithCustomError(locker, "InvalidParams");
      });
   });

   describe("Unlocking tokens", function () {
      beforeEach(async function () {
         const amount = ethers.parseEther("100");
         const blockNumBefore = await ethers.provider.getBlockNumber();
         const blockBefore = await ethers.provider.getBlock(blockNumBefore);
         const timestampBefore = blockBefore.timestamp;
         const unlockTime = timestampBefore + ONE_WEEK;
         await locker
            .connect(addr1)
            .createLockUp(
               token.target,
               amount,
               unlockTime,
               addr1.address,
               "Test Lock"
            );
      });

      it("Should not allow unlocking before unlock time", async function () {
         await expect(
            locker.connect(addr1).unlock(0)
         ).to.be.revertedWithCustomError(locker, "NotYetUnlocked");
      });

      it("Should allow unlocking after unlock time", async function () {
         await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
         await ethers.provider.send("evm_mine");

         await expect(locker.connect(addr1).unlock(0))
            .to.emit(locker, "TokensUnlocked")
            .withArgs(0, token.target, addr1.address, ethers.parseEther("100"));
      });

      it("Should not allow unlocking twice", async function () {
         await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
         await ethers.provider.send("evm_mine");

         await locker.connect(addr1).unlock(0);
         await expect(
            locker.connect(addr1).unlock(0)
         ).to.be.revertedWithCustomError(locker, "AlreadyClaimed");
      });

      it("Should not allow non-receiver to unlock", async function () {
         await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
         await ethers.provider.send("evm_mine");

         await expect(
            locker.connect(addr2).unlock(0)
         ).to.be.revertedWithCustomError(locker, "PermissionDenied");
      });
   });

   describe("Querying lock-ups", function () {
      beforeEach(async function () {
         const amount = ethers.parseEther("100");
         const blockNumBefore = await ethers.provider.getBlockNumber();
         const blockBefore = await ethers.provider.getBlock(blockNumBefore);
         const timestampBefore = blockBefore.timestamp;
         const unlockTime = timestampBefore + ONE_WEEK;
         await locker
            .connect(addr1)
            .createLockUp(
               token.target,
               amount,
               unlockTime,
               addr1.address,
               "Lock 1"
            );
         await locker
            .connect(addr1)
            .createLockUp(
               token.target,
               amount,
               unlockTime,
               addr2.address,
               "Lock 2"
            );
         await locker
            .connect(addr1)
            .createLockUp(
               token.target,
               amount,
               unlockTime,
               addr1.address,
               "Lock 3"
            );
      });

      it("Should return correct lock-up count", async function () {
         expect(await locker.lockUpCount()).to.equal(3);
      });

      it("Should return correct lock-up IDs by token", async function () {
         const ids = await locker.getLockUpIdsByToken(token.target, 0, 3);
         expect(ids.length).to.equal(3);
         expect(ids[0]).to.equal(0);
         expect(ids[1]).to.equal(1);
         expect(ids[2]).to.equal(2);
      });

      it("Should return correct lock-up IDs by receiver", async function () {
         const ids = await locker.getLockUpIdsByReceiver(addr1.address, 0, 3);
         expect(ids.length).to.equal(2);
         expect(ids[0]).to.equal(0);
         expect(ids[1]).to.equal(2);
      });

      it("Should revert with invalid pagination parameters", async function () {
         await expect(
            locker.getLockUpIdsByToken(token.target, 3, 2)
         ).to.be.revertedWithCustomError(locker, "InvalidPaginationParameters");
         await expect(
            locker.getLockUpIdsByReceiver(addr1.address, 0, 10001)
         ).to.be.revertedWithCustomError(locker, "InvalidPaginationParameters");
      });
   });

   describe("Pausing", function () {
      it("Should allow owner to pause and unpause", async function () {
         await locker.pause();
         expect(await locker.paused()).to.be.true;

         await locker.unpause();
         expect(await locker.paused()).to.be.false;
      });

      it("Should not allow non-owner to pause", async function () {
         await expect(locker.connect(addr1).pause()).to.be.reverted;
      });

      it("Should not allow creating lock-ups when paused", async function () {
         await locker.pause();

         const amount = ethers.parseEther("100");
         const unlockTime = Math.floor(Date.now() / 1000) + ONE_WEEK;

         await expect(
            locker
               .connect(addr1)
               .createLockUp(
                  token.target,
                  amount,
                  unlockTime,
                  addr1.address,
                  "Test Lock"
               )
         ).to.be.revertedWithCustomError(locker, "EnforcedPause");
      });
   });
});
