const getDeployer = require("./deployer");
const hre = require("hardhat");

const TOL = "0xB112116901C943E22fB4C10d685A607d320c6ca0";
const baseFee = "0.1";
const requiredTOL = "150";

async function main() {
   const deployer = await getDeployer();

   // Deploy Board Factory
   const BoardFactory = await hre.ethers.getContractFactory("BoardFactory");
   const factory = await BoardFactory.deploy(
      TOL,
      hre.ethers.parseEther(baseFee),
      hre.ethers.parseEther(requiredTOL)
   );
   await factory.waitForDeployment();

   // Deploy Ocean
   const Ocean = await hre.ethers.getContractFactory("Ocean");
   const ocean = await Ocean.deploy(factory.target, TOL, deployer);
   await ocean.waitForDeployment();

   // update ocean address
   await factory.updateOceanInstance(ocean.target);

   const tx = factory.deploymentTransaction();
   const tx2 = ocean.deploymentTransaction();
   const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);
   const receipt2 = await hre.ethers.provider.getTransactionReceipt(tx2.hash);

   console.log("======= BoardFactory =======");
   console.log("Gas used:", parseInt(receipt.gasUsed).toLocaleString());
   console.log(
      "Total fee:",
      hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
   );
   console.log("Contract address:", factory.target, "\n");

   console.log("====== Ocean =======");
   console.log("Gas used:", parseInt(receipt2.gasUsed).toLocaleString());
   console.log(
      "Total fee:",
      hre.ethers.formatEther(receipt2.gasUsed * receipt2.gasPrice)
   );
   console.log("Contract address:", ocean.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
