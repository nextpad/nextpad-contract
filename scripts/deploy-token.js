const getDeployer = require("./deployer");
const hre = require("hardhat");

async function main() {
   const deployer = await getDeployer();

   const NXPToken = await hre.ethers.deployContract("NXPToken");
   await NXPToken.waitForDeployment();
   console.log("TOL Token contract:", NXPToken.target);

   const Faucet = await hre.ethers.getContractFactory("Faucet");
   const faucet = await Faucet.deploy(
      NXPToken.target,
      hre.ethers.parseEther("100"),
      3600
   );
   // Mint tokens to the Faucet contract
   await NXPToken.mint(faucet.target, ethers.parseEther("100000"));

   const tx = NXPToken.deploymentTransaction();
   const tx2 = faucet.deploymentTransaction();
   const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);
   const receipt2 = await hre.ethers.provider.getTransactionReceipt(tx2.hash);

   console.log("======= NXPToken =======");
   console.log("Gas used:", parseInt(receipt.gasUsed).toLocaleString());
   console.log(
      "Total fee:",
      hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
   );
   console.log("Contract address:", NXPToken.target, "\n");

   console.log("====== Faucet =======");
   console.log("Gas used:", parseInt(receipt2.gasUsed).toLocaleString());
   console.log(
      "Total fee:",
      hre.ethers.formatEther(receipt2.gasUsed * receipt2.gasPrice)
   );
   console.log("Contract address:", faucet.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
