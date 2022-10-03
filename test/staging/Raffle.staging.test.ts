import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { rejects } from "assert"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, network } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { Raffle } from "../../typechain-types"
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", () => {
          let raffle: Raffle
          let deployer: SignerWithAddress
          let accounts: SignerWithAddress[]
          let ticketPrice: BigNumber

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              raffle = await ethers.getContract("Raffle", deployer)
              ticketPrice = await raffle.getTicketPrice()
              console.log("ticketPrice", ticketPrice.toString())
          })
          describe("FulfillRandomWords", async () => {
              console.log("settingUp test ...")
              it("should works with live chainlink keepers and chainlink VRF,we should get a random winner", async () => {
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  // setup listener before we enter the raffle
                  // just incase blockchain runs really fast
                  console.log("Setting up Listener...")
                  await new Promise<void>(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async (winner) => {
                          console.log("winner picked event fired!")
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              console.log(`recentWinner ${recentWinner}`)
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp()
                              const numPlayers =
                                  await raffle.getNumberOfPlayers() //this will return 0
                              const winnerEndingBalance =
                                  await accounts[0].getBalance()

                              //     asserts
                              await expect(raffle.getPlayer(0)).to.be.reverted // if array is empty, it will revert
                              assert.equal(
                                  recentWinner.toString(),
                                  deployer.address
                              )
                              assert.equal(raffleState.toString(), "0")
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(ticketPrice)
                                      .toString()
                              ) // deployer is the only one that entered the raffle.
                              // we are on the real test net bro understand that gocha?
                              // we can get account[1],accoun[2] of the real test net
                              assert(endingTimeStamp.gt(startingTimeStamp))
                              resolve()
                          } catch (error) {
                              reject(error)
                          }
                      })
                      //     entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({
                          value: ticketPrice,
                      })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance =
                          await accounts[0].getBalance()
                      //     this code wont complete untill our listener is fired and finished listening
                  })
              })
          })
      })
