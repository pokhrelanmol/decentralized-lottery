import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers, network } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"
import { log } from "console"

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 eth is a premium. It costs 0.25 Link to call the VRF
const GAS_PRICE_LINK = 1e9 // calculate gas price in Link. if the eth price goes up, the gas price will go up too
const deployMocks = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()
    if (developmentChains.includes(network.name)) {
        console.log("local network detected, deploying mock contracts...")

        /**
         * @dev  args is constructor arguments for the contract
         * @dev  to know what args this contract takes in, look at the contract constructor from github or locally
         * @dev visit https://github.com/smartcontractkit/chainlink/tree/develop/contracts/src/v0.8/mocks
         */

        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
            // waitConfirmations: networkConfig[chainId].blockConfirmations, // this gives error
            waitConfirmations: 1,
        })
        log("mocks deployed....")
        log("____________________________________________")
    }
}
export default deployMocks
deployMocks.tags = ["all", "mocks"]
