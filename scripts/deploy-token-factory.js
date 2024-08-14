const getDeployer = require("./deployer");
const hre = require("hardhat");

async function main() {
   const deployer = await getDeployer();

   const TokenFactory = await ethers.getContractFactory("TokenFactory");
   const tokenFactory = await TokenFactory.deploy(deployer);

   // Set the base fee for creating a token
   const baseFee = ethers.parseEther("0.1");
   await tokenFactory.setBaseFee(baseFee);

   const tx = tokenFactory.deploymentTransaction();
   const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);

   console.log("Gas used:", parseInt(receipt.gasUsed).toLocaleString());
   console.log(
      "Total fee:",
      hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
   );
   console.log("Token Factory contract:", tokenFactory.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
