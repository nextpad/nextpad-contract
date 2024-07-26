require("dotenv").config();
const hre = require("hardhat");

async function main() {
   const accounts = await hre.ethers.getSigners();
   const deployer = accounts[0].address;
   console.log(`Deploy from account: ${deployer}`);

   const TokenFactory = await ethers.getContractFactory("TokenFactory");
   const tokenFactory = await TokenFactory.deploy(deployer);
   // Set the base fee for creating a token
   const baseFee = ethers.parseEther("0.1");
   await tokenFactory.setBaseFee(baseFee);
   console.log("Token Factory contract:", tokenFactory.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
