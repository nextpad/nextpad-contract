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
      edu: {
         url: process.env.RPC_OPENCAMPUS,
         chainId: 656476,
         accounts: [process.env.PRIVATE_KEY],
      },
   },
};
