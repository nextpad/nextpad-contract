const hre = require("hardhat");

async function getDeployer() {
   const accounts = await hre.ethers.getSigners();
   const deployer = accounts[0].address;
   const balance = await hre.ethers.provider.getBalance(deployer);
   console.log(`Deploy from account: ${deployer}`);
   console.log(`Balance: ${hre.ethers.formatEther(balance)}\n`);

   return deployer;
}

module.exports = getDeployer;
