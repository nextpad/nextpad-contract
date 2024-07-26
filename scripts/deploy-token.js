require("dotenv").config();
const hre = require("hardhat");

async function main() {
   const accounts = await hre.ethers.getSigners();
   const deployer = accounts[0].address;
   console.log(`Deploy from account: ${deployer}`);

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
   console.log("Faucet contract: ", faucet.target);
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
