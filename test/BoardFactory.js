const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("BoardFactory and Board", () => {
   let NXPToken, FundedToken, Ocean, BoardFactory;
   let nxpToken, fundedToken, ocean, boardFactory, board;
   let owner, addr1, addr2, addr3, addr4;
   let startDate, deadline;

   const MINUTE = 60;
   const HOUR = 60 * MINUTE;
   const DAY = 24 * HOUR;

   const setupContracts = async () => {
      [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const currentTimestamp = await ethers.provider.getBlock(blockNumBefore);
      startDate = currentTimestamp.timestamp + HOUR;
      deadline = currentTimestamp.timestamp + DAY;

      NXPToken = await ethers.getContractFactory("NXPToken");
      FundedToken = await ethers.getContractFactory("NXPToken");
      Ocean = await ethers.getContractFactory("Ocean");
      BoardFactory = await ethers.getContractFactory("BoardFactory");

      nxpToken = await NXPToken.deploy();
      fundedToken = await FundedToken.deploy();
      boardFactory = await BoardFactory.deploy(
         nxpToken.target,
         ethers.parseEther("1"),
         ethers.parseEther("1000")
      );
      ocean = await Ocean.deploy(
         boardFactory.target,
         nxpToken.target,
         addr2.address
      );

      await nxpToken.mint(owner.address, ethers.parseEther("100000"));
   };

   const createLaunchpad = async () => {
      await boardFactory.updateOceanInstance(ocean.target);
      await fundedToken.approve(boardFactory.target, ethers.MaxUint256);
      await fundedToken.mint(owner.address, ethers.parseEther("1000000"));

      const tx = await boardFactory.createLaunchpad(
         fundedToken.target,
         ethers.parseEther("1"),
         ethers.parseEther("10"),
         1000,
         startDate,
         deadline,
         ethers.parseEther("10"),
         10,
         "some-cid",
         ethers.parseEther("40000"),
         ethers.parseEther("6000"),
         { value: ethers.parseEther("1") }
      );

      const filter = boardFactory.filters.LaunchpadCreated();
      const events = await boardFactory.queryFilter(filter);
      const launchpadAddress = events[0].args.launchpadAddress;

      board = await ethers.getContractAt("Board", launchpadAddress);
   };

   const mintAndApproveNXP = async (address, amount) => {
      await nxpToken.mint(address, amount);
      await nxpToken.connect(address).approve(board.target, amount);
   };

   const advanceTime = async (seconds) => {
      await network.provider.send("evm_increaseTime", [seconds]);
      await network.provider.send("evm_mine");
   };

   beforeEach(setupContracts);

   describe("BoardFactory", () => {
      it("Should create a new launchpad", async () => {
         await createLaunchpad();
         expect(board.target).to.not.equal(ethers.ZeroAddress);
      });

      it("should set new base fee", async () => {
         const newFee = ethers.parseEther("2");
         await boardFactory.setBaseFee(newFee);
         expect(await boardFactory.baseFee()).to.equal(newFee);
      });
   });

   describe("Board", () => {
      beforeEach(createLaunchpad);

      it("Should allow voting launchpad", async () => {
         await mintAndApproveNXP(addr1, ethers.parseEther("500"));
         await mintAndApproveNXP(addr2, ethers.parseEther("500"));

         await advanceTime(HOUR + 1);

         await board.connect(addr1).voteProject(ethers.parseEther("500"));
         await board.connect(addr2).voteProject(ethers.parseEther("500"));

         expect(await nxpToken.balanceOf(addr1.address)).to.equal(0);
      });

      it("Should not allow voting launchpad for the owner", async () => {
         await mintAndApproveNXP(owner, ethers.parseEther("1000"));

         await advanceTime(HOUR + 1);

         await expect(
            board.connect(owner).voteProject(ethers.parseEther("20"))
         ).to.be.revertedWith("Owner not allowed");
      });

      it("Should not allow voting launchpad for less than minimum", async () => {
         await mintAndApproveNXP(addr1, ethers.parseEther("1000"));

         await advanceTime(HOUR + 1);

         await expect(
            board.connect(addr1).voteProject(ethers.parseEther("10"))
         ).to.be.revertedWith("The amount is not enough");
      });

      it("Should not allow buying presale before start date", async () => {
         await expect(
            board.connect(addr1).buyPresale({ value: ethers.parseEther("5") })
         ).to.be.revertedWith("Presale has not started yet");
      });

      it("Should allow buying presale after start date", async () => {
         await mintAndApproveNXP(addr1, ethers.parseEther("1000"));
         await mintAndApproveNXP(addr2, ethers.parseEther("1000"));

         await advanceTime(HOUR + 1);

         await board.connect(addr1).voteProject(ethers.parseEther("500"));
         await board.connect(addr2).voteProject(ethers.parseEther("500"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("5") });

         expect(await board.getAllocation(addr1.address)).to.equal(
            ethers.parseEther("5000")
         );
         expect(await board.totalContributors()).to.equal(1);
      });

      it("Should not allow buying presale exceeds max allocation per user", async () => {
         await mintAndApproveNXP(addr1, ethers.parseEther("1000"));
         await mintAndApproveNXP(addr2, ethers.parseEther("1000"));

         await advanceTime(HOUR + 1);

         await board.connect(addr1).voteProject(ethers.parseEther("500"));
         await board.connect(addr2).voteProject(ethers.parseEther("500"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("5") });

         await expect(
            board.connect(addr1).buyPresale({ value: ethers.parseEther("2") })
         ).to.be.revertedWith("Exceeds max allocation");
      });

      it("Should not allow buying presale for the owner", async () => {
         await mintAndApproveNXP(addr1, ethers.parseEther("1000"));
         await mintAndApproveNXP(addr2, ethers.parseEther("1000"));

         await advanceTime(HOUR + 1);

         await board.connect(addr1).voteProject(ethers.parseEther("500"));
         await board.connect(addr2).voteProject(ethers.parseEther("500"));

         await expect(
            board.connect(owner).buyPresale({ value: ethers.parseEther("2") })
         ).to.be.revertedWith("Owner not allowed");
      });

      it("Should allow token withdrawal after presale finalized", async () => {
         await mintAndApproveNXP(addr3, ethers.parseEther("10000"));
         await mintAndApproveNXP(addr4, ethers.parseEther("10000"));

         await advanceTime(HOUR + 1);

         await board.connect(addr4).voteProject(ethers.parseEther("500"));
         await board.connect(addr3).voteProject(ethers.parseEther("500"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("6") });
         await board
            .connect(addr2)
            .buyPresale({ value: ethers.parseEther("4") });

         const prevBalance = await ethers.provider.getBalance(owner.address);

         await advanceTime(DAY + 2);
         await board.finalizePresale();

         await board.connect(addr1).withdrawToken();

         const fundedBalance = await fundedToken.balanceOf(addr1.address);
         const finalBalance = await ethers.provider.getBalance(board.target);
         const ownerBalance = await ethers.provider.getBalance(owner.address);

         expect(fundedBalance).to.equal(ethers.parseEther("6000"));
         expect(finalBalance).to.equal(ethers.parseEther("0"));
         expect(parseInt(ethers.formatEther(prevBalance))).to.be.below(
            parseInt(ethers.formatEther(ownerBalance))
         );
      });

      it("Should allow refund if presale fails", async () => {
         await mintAndApproveNXP(addr1, ethers.parseEther("1000"));
         await mintAndApproveNXP(addr2, ethers.parseEther("1000"));

         await advanceTime(HOUR + 1);

         await board.connect(addr1).voteProject(ethers.parseEther("500"));
         await board.connect(addr2).voteProject(ethers.parseEther("500"));
         await board
            .connect(addr1)
            .buyPresale({ value: ethers.parseEther("5") });

         await advanceTime(DAY + 1);
         await board.finalizePresale();

         const initialBalance = await ethers.provider.getBalance(addr1.address);
         await board.connect(addr1).refund();
         const finalBalance = await ethers.provider.getBalance(addr1.address);

         expect(finalBalance).to.be.above(initialBalance);
      });

      it("Should allow emergency withdrawal during active presale", async () => {
         await mintAndApproveNXP(addr1, ethers.parseEther("1000"));
         await mintAndApproveNXP(addr2, ethers.parseEther("1000"));

         await advanceTime(HOUR + 1);

         await board.connect(addr1).voteProject(ethers.parseEther("500"));
         await board.connect(addr2).voteProject(ethers.parseEther("500"));
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
