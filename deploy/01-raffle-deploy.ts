import { HardhatRuntimeEnvironment } from "hardhat/types"
import { ethers, network } from "hardhat"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import { VRFCoordinatorV2Mock } from "../typechain-types"
import { verify } from "../utils/verify"
import { log } from "console"
const VRF_SUBSCRIPTION_FUND_AMOUNT = "1000000000000000000" // 0.1 eth is a premium. It costs 0.1 Link to call the
const deployRaffle = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments
    /**
     * @Note 1: if you want to deploy to a local network, you need to deploy the mock contracts first
     * @dev Be aware of the network listed in networkConfig and the network you are deploying to.Both must match
     */
    const chainId = network.config.chainId as number // this is the chain id of the network we are deploying to
    const { deployer } = await getNamedAccounts()
    let VRFCoordinatorV2Address
    let VRFCoordinatorV2Mock: VRFCoordinatorV2Mock
    let subscriptionId
    if (developmentChains.includes(network.name)) {
        VRFCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        )
        VRFCoordinatorV2Address = VRFCoordinatorV2Mock.address
        /**
         * @dev creating a subscription Id programmatically
         */
        const txResponse = await VRFCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscriptionId = txReceipt.events?.[0].args?.subId //get the subscription id from the event
        console.log(`subscriptionId: ${subscriptionId.toString()}`)
        // usually fund subscription will need link token
        await VRFCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUBSCRIPTION_FUND_AMOUNT
        )
    } else {
        VRFCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    const ticketPrice = networkConfig[chainId].ticketPrice
    const gasLane = networkConfig[chainId].gasLane
    const callBackGasLimit = networkConfig[chainId].callBackGasLimit
    const interval = networkConfig[chainId].interval
    const blockConfirmations = networkConfig[chainId].blockConfirmations

    const args = [
        VRFCoordinatorV2Address,
        subscriptionId,
        gasLane,
        interval,
        ticketPrice,
        callBackGasLimit,
    ]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        // waitConfirmations: networkConfig[chainId].blockConfirmations, // this gives error
        waitConfirmations: blockConfirmations,
    })
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
            "VRFCoordinatorV2Mock"
        )
        await vrfCoordinatorV2Mock.addConsumer(
            subscriptionId.toNumber(),
            raffle.address
        )
        log("adding consumer...")
    }

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        // use this to verify contract on etherscan
        log("verifying contracts...")
        await verify(raffle.address, args)
    }
    log("-----------------------------------------")
}
export default deployRaffle
deployRaffle.tags = ["all", "raffle"]
