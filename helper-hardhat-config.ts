import { BigNumber } from "ethers"
import { ethers } from "hardhat"

export interface networkConfigItem {
    name: string
    vrfCoordinatorV2?: string

    gasLane: string // also called key hash
    subscriptionId: string
    interval: string
    callBackGasLimit: string
    ticketPrice: BigNumber
    blockConfirmations: number
}
export interface networkConfigInfo {
    [key: number]: networkConfigItem
}
export const networkConfig: networkConfigInfo = {
    /***
     * @dev get vrfCoordinatorV2 address from https://docs.chain.link/docs/vrf/v2/subscription/supported-networks/
     */
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        ticketPrice: ethers.utils.parseEther("0.1"),
        gasLane:
            "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei

        callBackGasLimit: "500000",
        interval: "30",
        subscriptionId: "3336",
        blockConfirmations: 1,
    },
    31337: {
        name: "hardhat",
        ticketPrice: ethers.utils.parseEther("0.1"),
        gasLane:
            "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callBackGasLimit: "500000",
        interval: "30",
        subscriptionId:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        blockConfirmations: 1,
    },
    // 137: {
    //     name: "polygon",
    //     vrfCoordinatorV2: "0xAE975071Be8F8eE67addBC1A82488F1C24858067",
    // },
}
export const developmentChains = ["hardhat", "localhost"]
export const DECIMALS = 18
export const INITIAL_ANSWER = "2000000000000000000000" //2000
