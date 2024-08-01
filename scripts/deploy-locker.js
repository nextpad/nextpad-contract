require("dotenv").config();
const hre = require("hardhat");

async function main() {
   const accounts = await hre.ethers.getSigners();
   const deployer = accounts[0].address;
   console.log(`Deploy from account: ${deployer}`);

   // Deploy Locker contract
   const Locker = await ethers.getContractFactory("Locker");
   const locker = await Locker.deploy();
   console.log("Locker contract:", locker.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
