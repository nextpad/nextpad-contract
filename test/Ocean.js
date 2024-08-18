const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ocean", function () {
   let Ocean, ocean, NXPToken, nxpToken, owner, addr1, addr2;

   beforeEach(async function () {
      [owner, addr1, addr2] = await ethers.getSigners();

      // Deploy mock NXPToken
      const NXPToken = await ethers.getContractFactory("NXPToken");
      nxpToken = await NXPToken.deploy();

      // Deploy Ocean contract
      const Ocean = await ethers.getContractFactory("Ocean");
      ocean = await Ocean.deploy(addr1.address, nxpToken.target, addr2.address);

      await ocean
         .connect(addr1)
         .storeProject(
            addr2.address,
            addr2.address,
            "QmCID",
            ethers.parseEther("1000")
         );
   });

   describe("Project Management", function () {
      it("Should store a new project", async function () {
         const project = await ocean.projects(addr2.address);
         expect(project.owner).to.equal(addr2.address);
         expect(project.cid).to.equal("QmCID");
      });

      it("Should update the CID of an existing project", async function () {
         await ocean.connect(addr2).updateProject(addr2.address, "QmNewCID");
         const project = await ocean.projects(addr2.address);
         expect(project.cid).to.equal("QmNewCID");
      });

      it("Should terminate a project", async function () {
         await ocean.terminateProject(addr2.address);
         const project = await ocean.projects(addr2.address);
         expect(project.isTerminated).to.be.true;
      });

      it("Should boost a project", async function () {
         await ocean.setBoostRate(2);
         await nxpToken.mint(owner.address, ethers.parseEther("100"));
         await nxpToken.transfer(addr2.address, ethers.parseEther("10"));
         await nxpToken
            .connect(addr2)
            .approve(ocean.target, ethers.parseEther("10"));
         await ocean
            .connect(addr2)
            .boostProject(addr2.address, ethers.parseEther("10"));
         const project = await ocean.projects(addr2.address);
         expect(project.boostPoint).to.equal(5);
      });
   });

   describe("Access Control", function () {
      it("Should only allow the factory to store projects", async function () {
         await expect(
            ocean.storeProject(
               addr2.address,
               addr2.address,
               "QmCID",
               ethers.parseEther("1000")
            )
         ).to.be.revertedWith("Only the factory can call this function");
      });

      it("Should only allow the project owner to update the project CID", async function () {
         await expect(
            ocean.connect(addr1).updateProject(addr2.address, "QmNewCID")
         ).to.be.revertedWith("Only the project owner can call this function");
      });

      it("Should only allow the owner to terminate projects", async function () {
         await expect(
            ocean.connect(addr2).terminateProject(addr2.address)
         ).to.be.revertedWith("Ownable: caller is not the owner");
      });
   });
});
