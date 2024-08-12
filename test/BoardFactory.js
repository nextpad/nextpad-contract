const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("BoardFactory", () => {
   let TOLToken, FundedToken, Ocean, Board, BoardFactory;
   let tolToken, fundedToken, ocean, boardFactory;
   let owner, addr1, addr2;
   const minBuy = ethers.parseEther("1");
   const maxBuy = ethers.parseEther("10");
   const rates = 1000;
   let startDate;
   let deadline; // 1 day from now
   const targetRaised = ethers.parseEther("10");
   const rewardRatePerTOL = 10;
   const cid = "some-cid";
   const minimumTOLRequired = ethers.parseEther("1000");

   beforeEach(async () => {
      [owner, addr1, addr2] = await ethers.getSigners();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      startDate = currentTimestamp + 60 * 60;
      deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

      TOLToken = await ethers.getContractFactory("TOLToken");
      FundedToken = await ethers.getContractFactory("TOLToken");
      Ocean = await ethers.getContractFactory("Ocean");
      BoardFactory = await ethers.getContractFactory("BoardFactory");

      tolToken = await TOLToken.deploy();
      fundedToken = await FundedToken.deploy();
      boardFactory = await BoardFactory.deploy(
         tolToken.target,
         ethers.parseEther("1"),
         minimumTOLRequired
      );
      ocean = await Ocean.deploy(
         boardFactory.target,
         tolToken.target,
         addr2.address
      );

      // Fund owner with initial tokens
      await tolToken.mint(owner.address, ethers.parseEther("100000"));
   });

   describe("BoardFactory", () => {
      it("Should create a new launchpad", async () => {
         await boardFactory.updateOceanInstance(ocean.target);

         await fundedToken.approve(boardFactory.target, ethers.MaxUint256);
         await fundedToken.mint(owner.address, ethers.parseEther("1000000"));
         const tx = await boardFactory.createLaunchpad(
            fundedToken.target,
            minBuy,
            maxBuy,
            rates,
            startDate,
            deadline,
            targetRaised,
            rewardRatePerTOL,
            cid,
            ethers.parseEther("40000"),
            {
               value: ethers.parseEther("1"),
            }
         );
         const filter = boardFactory.filters.LaunchpadCreated();
         const events = await boardFactory.queryFilter(filter);
         const launchpadAddress = events[0].args.launchpadAddress;

         expect(launchpadAddress).to.not.equal(ethers.ZeroAddress);
      });

      it("should set new base fee", async function () {
         const newFee = ethers.parseEther("2");
         await boardFactory.setBaseFee(newFee);

         const baseFee = await boardFactory.baseFee();
         expect(baseFee).to.equal(ethers.parseEther("2"));
      });
   });

   describe("Board", () => {
      let board;
      beforeEach(async () => {
         // getting timestamp
         const blockNumBefore = await ethers.provider.getBlockNumber();
         const blockBefore = await ethers.provider.getBlock(blockNumBefore);
         startDate = blockBefore.timestamp + 60 * 60;
         deadline = blockBefore.timestamp + 60 * 60 * 24;

         await boardFactory.updateOceanInstance(ocean.target);

         await fundedToken.approve(boardFactory.target, ethers.MaxUint256);
         await fundedToken.mint(owner.address, ethers.parseEther("1000000"));
         const tx = await boardFactory.createLaunchpad(
            fundedToken.target,
            minBuy,
            maxBuy,
            rates,
            startDate,
            deadline,
            targetRaised,
            rewardRatePerTOL,
            cid,
            ethers.parseEther("40000"),
            {
               value: ethers.parseEther("1"),
            }
         );
         const filter = boardFactory.filters.LaunchpadCreated();
         const events = await boardFactory.queryFilter(filter);
         const launchpadAddress = events[0].args.launchpadAddress;

         board = await ethers.getContractAt("Board", launchpadAddress);
      });

      it("Should allow voting launchpad", async () => {
         await tolToken.mint(addr1.address, ethers.parseEther("1000"));
         await tolToken
            .connect(addr1)
            .approve(board.target, ethers.parseEther("1000"));

         // Move time forward to after start date
         await network.provider.send("evm_increaseTime", [60 * 60 + 1]); // 1 hour and 1 second
         await network.provider.send("evm_mine");

         await board.connect(addr1).placeTOL(ethers.parseEther("1000"));

         const balance = await tolToken.balanceOf(addr1.address);
         expect(balance).to.equal(ethers.parseEther("0"));
      });

      it("Should not allow voting launchpad for less than minimum", async () => {
         await tolToken.mint(addr1.address, ethers.parseEther("1000"));
         await tolToken
            .connect(addr1)
            .approve(board.target, ethers.parseEther("1000"));

         // Move time forward to after start date
         await network.provider.send("evm_increaseTime", [60 * 60 + 1]); // 1 hour and 1 second
         await network.provider.send("evm_mine");

         await expect(
            board.connect(addr1).placeTOL(ethers.parseEther("10"))
         ).to.be.revertedWith("The amount is not enough");
         const balance = await tolToken.balanceOf(addr1.address);
         expect(balance).to.equal(ethers.parseEther("1000"));
      });

      it("Should not allow buying presale before start date", async () => {
         await tolToken.mint(addr1.address, ethers.parseEther("1000"));
         await tolToken
            .connect(addr1)
            .approve(board.target, ethers.parseEther("1000"));

         await expect(
            board.connect(addr1).buyPresale({ value: ethers.parseEther("5") })
         ).to.be.revertedWith("Presale has not started yet");
      });

      it("Should allow buying presale after start date", async () => {
         await tolToken.mint(addr1.address, ethers.parseEther("1000"));
         await tolToken
            .connect(addr1)
            .approve(board.target, ethers.parseEther("1000"));

         // Move time forward to after start date
         await network.provider.send("evm_increaseTime", [60 * 60 + 1]); // 1 hour and 1 second
         await network.provider.send("evm_mine");

         await board.connect(addr1).placeTOL(ethers.parseEther("1000"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("5") });

         const allocation = await board.getAllocation(addr1.address);
         const contributors = await board.totalContributors();
         expect(allocation).to.equal(ethers.parseEther((5 * rates).toString()));
         expect(contributors).to.equal("1");
      });

      it("Should allow token withdrawal after presale finalized", async () => {
         await tolToken.mint(addr1.address, ethers.parseEther("10000"));
         await tolToken
            .connect(addr1)
            .approve(board.target, ethers.parseEther("10000"));

         // Move time forward to after start date
         await network.provider.send("evm_increaseTime", [60 * 60 + 1]); // 1 hour and 1 second
         await network.provider.send("evm_mine");

         await board.connect(addr1).placeTOL(ethers.parseEther("1000"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("10") });

         // Finalize the presale
         await network.provider.send("evm_increaseTime", [60 * 60 * 24 + 2]); // Move forward in time
         await board.finalizePresale();

         await board.connect(addr1).withdrawToken();
         const fundedBalance = await fundedToken.balanceOf(addr1.address);
         expect(fundedBalance).to.equal(ethers.parseEther("20000"));
      });

      it("Should allow refund if presale fails", async () => {
         await tolToken.mint(addr1.address, ethers.parseEther("1000"));
         await tolToken
            .connect(addr1)
            .approve(board.target, ethers.parseEther("1000"));

         // Move time forward to after start date
         await network.provider.send("evm_increaseTime", [60 * 60 + 1]); // 1 hour and 1 second
         await network.provider.send("evm_mine");

         await board.connect(addr1).placeTOL(ethers.parseEther("1000"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("5") });

         // Finalize the presale
         await network.provider.send("evm_increaseTime", [60 * 60 * 24 + 1]); // Move forward in time
         await board.finalizePresale();

         const initialBalance = await ethers.provider.getBalance(addr1.address);
         await board.connect(addr1).refund();
         const finalBalance = await ethers.provider.getBalance(addr1.address);
         expect(finalBalance).to.be.above(initialBalance);
      });

      it("Should allow emergency withdrawal during active presale", async () => {
         await tolToken.mint(addr1.address, ethers.parseEther("1000"));
         await tolToken
            .connect(addr1)
            .approve(board.target, ethers.parseEther("1000"));

         // Move time forward to after start date
         await network.provider.send("evm_increaseTime", [60 * 60 + 1]); // 1 hour and 1 second
         await network.provider.send("evm_mine");

         await board.connect(addr1).placeTOL(ethers.parseEther("1000"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("5") });

         const initialBalance = await ethers.provider.getBalance(addr1.address);
         await board.connect(addr1).emergencyWithdraw();
         const finalBalance = await ethers.provider.getBalance(addr1.address);
         expect(finalBalance).to.be.above(initialBalance);
      });
   });
});
