import { run } from "hardhat"

export const verify = async (contractAddress: string, args: string[]) => {
    console.log("verifying contracts...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (er) {
        const ex: Error = er as Error
        if (ex.message.includes("already verified")) {
            console.log("Contract already verified")
        } else {
            console.log(ex)
        }
    }
}
