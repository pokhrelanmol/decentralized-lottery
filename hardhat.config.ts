import { HardhatUserConfig } from "hardhat/config"

import "@typechain/hardhat"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-gas-reporter"
import "dotenv/config"
import "solidity-coverage"
import "hardhat-deploy"
import dotenv from "dotenv"
dotenv.config()

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || ""
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY || ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""

const config: HardhatUserConfig = {
    // solidity: "0.8.11",
    // define multiple solidity compiler
    defaultNetwork: "hardhat",
    solidity: {
        compilers: [
            { version: "0.8.11" },
            { version: "0.8.8" },
            { version: "0.6.6" },
        ],
    },
    // set account as deployer
    namedAccounts: {
        deployer: {
            default: 0,
            // 5:1 // 1st account on goerli
            // 4:0 // 2nd account on rinkeby
        },
        player: {
            default: 1,
        },
    },
    networks: {
        localHost: {
            url: "http://localhost:8545",
            // accounts: hardhat will automtically provide 20 accounts
            chainId: 31337,
        },

        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [GOERLI_PRIVATE_KEY],
            chainId: 5,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: false,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
    mocha: {
        timeout: 400000, // 200 seconds
    },
}

export default config
