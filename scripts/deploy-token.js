const getDeployer = require("./deployer");
const hre = require("hardhat");

async function main() {
   const deployer = await getDeployer();

   const TOLToken = await hre.ethers.deployContract("TOLToken");
   await TOLToken.waitForDeployment();
   console.log("TOL Token contract:", TOLToken.target);

   const Faucet = await hre.ethers.getContractFactory("Faucet");
   const faucet = await Faucet.deploy(
      TOLToken.target,
      hre.ethers.parseEther("100"),
      3600
   );
   // Mint tokens to the Faucet contract
   await TOLToken.mint(faucet.target, ethers.parseEther("100000"));

   const tx = TOLToken.deploymentTransaction();
   const tx2 = faucet.deploymentTransaction();
   const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);
   const receipt2 = await hre.ethers.provider.getTransactionReceipt(tx2.hash);

   console.log("======= TOLToken =======");
   console.log("Gas used:", parseInt(receipt.gasUsed).toLocaleString());
   console.log(
      "Total fee:",
      hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
   );
   console.log("Contract address:", TOLToken.target, "\n");

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
