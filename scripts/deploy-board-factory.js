require("dotenv").config();
const hre = require("hardhat");

const TOL = "0x51eF9Ae8f376A39A8fd18D96888c7Dc05C703747";
const baseFee = "0.1";
const requiredTOL = "50";

async function main() {
   const accounts = await hre.ethers.getSigners();
   const deployer = accounts[0].address;
   const balance = await hre.ethers.provider.getBalance(deployer);
   console.log(`Deploy from account: ${deployer}`);
   console.log(`Balance: ${hre.ethers.formatEther(balance)}`);

   // Deploy Board Factory
   const BoardFactory = await hre.ethers.getContractFactory("BoardFactory");
   const factory = await BoardFactory.deploy(
      TOL,
      hre.ethers.parseEther(baseFee),
      hre.ethers.parseEther(requiredTOL)
   );
   console.log("BoardFactory contract:", factory.target);

   // Deploy Ocean
   const Ocean = await hre.ethers.getContractFactory("Ocean");
   const ocean = await Ocean.deploy(factory.target, TOL, deployer);
   console.log("Ocean contract:", ocean.target);

   // update ocean address
   await factory.updateOceanInstance(ocean.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
