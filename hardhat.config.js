require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
   solidity: "0.8.24",
   networks: {
      sepolia: {
         url: process.env.RPC_SEPOLIA,
         chainId: 11155111,
         accounts: [process.env.PRIVATE_KEY],
      },
      core: {
         url: process.env.RPC_CORE,
         chainId: 1115,
         accounts: [process.env.PRIVATE_KEY],
      },
   },
};
