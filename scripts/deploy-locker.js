const getDeployer = require("./deployer");
const hre = require("hardhat");

async function main() {
   const deployer = await getDeployer();

   // Deploy Locker contract
   const Locker = await ethers.getContractFactory("Locker");
   const locker = await Locker.deploy();

   const tx = locker.deploymentTransaction();
   const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);

   console.log("Gas used:", parseInt(receipt.gasUsed).toLocaleString());
   console.log(
      "Total fee:",
      hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
   );
   console.log("Locker contract:", locker.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
