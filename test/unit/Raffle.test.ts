import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, network } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", () => {
          let raffle: Raffle
          let deployer: SignerWithAddress
          let accounts: SignerWithAddress[]
          let VRFCoordinatorV2Mock: VRFCoordinatorV2Mock
          let ticketPrice: BigNumber
          let interval: BigNumber

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["all"]) // deploy all scripts in deploy folder
              raffle = await ethers.getContract("Raffle", deployer)
              VRFCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
              ticketPrice = await raffle.getTicketPrice()
              interval = await raffle.getInterval()
          })

          describe("constructor", async () => {
              const CHAIN_ID = network.config.chainId as number
              it("initializes the raffle correctly", async () => {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0") // we are using enums for this OPEN =0
                  assert.equal(
                      interval.toString(),
                      networkConfig[CHAIN_ID].interval.toString()
                  )
              })
          })
          describe("Enter Raffle", async () => {
              it("should revert if less then 0.1 eth is send", async () => {
                  // sending 0 eth
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughEtherEntered"
                  )
              })
              it("successfully enters the raffle and emit event", async () => {
                  // sending 0.1 eth
                  await expect(
                      raffle.enterRaffle({
                          value: ticketPrice,
                      })
                  )
                      .to.emit(raffle, "RaffleEntered")
                      .withArgs(deployer.address)
              })
              it("should record the player when entered", async () => {
                  // sending 0.1 eth
                  await raffle.enterRaffle({
                      value: ticketPrice,
                  })
                  const player = await raffle.getPlayer(0)
                  assert.equal(player, deployer.address)
              })

              it("doesnt allow entry if raffle is calculating", async () => {
                  await raffle.enterRaffle({
                      value: ticketPrice,
                  })
                  /**
                   * @dev manually increasing  the block time to test the interval
                   * @dev contract code =>  interval = block.timestamp
                   * @dev after every 30 sec the raffle will be closed and winner will be declared and again raffle will be open
                   * @dev here we are just closing the raffle manually by increasing the block time
                   *@dev so we can make the raffle close and test the code  in closed state
                   */
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.request({
                      method: "evm_mine",
                      params: [],
                  }) // mine the block
                  await raffle.performUpkeep([]) // now the raffle is calculating and closed
                  await expect(
                      raffle.enterRaffle({ value: ticketPrice })
                  ).to.be.revertedWith("Raffle__RaffleNotOpen")
              })
              describe("CheckUpkeep", async () => {
                  it("returns false if people haven't sent ETH", async () => {
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      /**
                       * @dev checkUpKeep is a public function which hardhat will treat like a tx
                       * @dev to get the return value we need to use callStatic
                       */
                      const { upkeepNeeded } =
                          await raffle.callStatic.checkUpkeep([])
                      assert.equal(upkeepNeeded, false)
                  })
                  it("will return false if raffle isn't open", async () => {
                      await raffle.enterRaffle({
                          value: ticketPrice,
                      })
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      await raffle.performUpkeep("0x") // now the raffle is calculating and closed
                      const raffleState = await raffle.getRaffleState()
                      const { upkeepNeeded } =
                          await raffle.callStatic.checkUpkeep([])
                      assert.equal(raffleState.toString(), "1")
                      assert.equal(upkeepNeeded, false)
                  })
                  it("return false if enough time has not passed", async () => {
                      await raffle.enterRaffle({
                          value: ticketPrice,
                      })

                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() - 2,
                      ])

                      await network.provider.send("evm_mine", [])

                      const { upkeepNeeded } =
                          await raffle.callStatic.checkUpkeep([])
                      assert.equal(upkeepNeeded, false)
                  })
                  it("return true if enough time has passed passed ,has playes,eth and is open", async () => {
                      await raffle.enterRaffle({
                          value: ticketPrice,
                      })
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      const { upkeepNeeded } =
                          await raffle.callStatic.checkUpkeep([])
                      assert.equal(upkeepNeeded, true)
                  })
              })
              describe("PerformUpkeep", async () => {
                  it("can only run if checkUpkeep returns true", async () => {
                      await raffle.enterRaffle({
                          value: ticketPrice,
                      })
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      const tx = await raffle.performUpkeep("0x") //if checkUpkeep returns true then this will run
                      assert(tx)
                  })
                  it("reverts if checkUpkeep returns false", async () => {
                      await expect(
                          raffle.performUpkeep("0x")
                      ).to.be.revertedWith("Raffle__UpKeepNotNeeded")
                  })
                  it("change the raffle state,emit the event and call vrf coordinator", async () => {
                      await raffle.enterRaffle({
                          value: ticketPrice,
                      })
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      const txRes = await raffle.performUpkeep("0x")
                      const txReceipt = await txRes.wait(1)
                      const requestId = txReceipt.events?.[1].args?.requestId // emiting 1st event because performUpkeep is also emitting an event if we wish then we can remove our event
                      const raffleState = await raffle.getRaffleState()
                      assert(requestId.toNumber() > 0)
                      assert.equal(raffleState.toString(), "1")
                  })
              })
          })
          describe("FullfillRandomWords", async () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: ticketPrice })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpkeep", async () => {
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // requestId = 0
                  ).to.be.revertedWith("nonexistent request") // this is from vrfCoordinatorV2Mock contract
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // requestId = 1
                  ).to.be.revertedWith("nonexistent request") // this is from vrfCoordinatorV2Mock contract
              })
              it("picks the winner ,reset the raffle and send money", async () => {
                  const additionalEntrants = 3
                  const startingAccountIndex = 1
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({
                          value: ticketPrice,
                      })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  /**
                   * @dev performUpKeep(). manually call as if you were the chainlink keepers
                   * @dev fulfillRandomWords(). manually call as if you were the chainlink vrf coordinator
                   * @dev we have to wait for fulfillRandomWords to be called
                   * @dev use promise to wait for fulfillRandomWords to be called
                   * @dev we cant wait forever so we will use timeout. set timeout in hardhat config under mocha
                   */
                  await new Promise<void>(async (resolve, reject) => {
                      //  this will listen for the event
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event emitted")
                          console.log(`account 1 ${accounts[1].address}`)
                          console.log(`account 2 ${accounts[2].address}`)
                          console.log(`account 3 ${accounts[3].address}`)
                          console.log(`account 4 ${accounts[4].address}`)

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
                                  await ethers.provider.getBalance(recentWinner)
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0") //should be open
                              assert(endingTimeStamp > startingTimeStamp) //when we pick winner we reset the timestamp

                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(
                                          ticketPrice
                                              .mul(additionalEntrants) // 0.25 * 3 = 0.75
                                              .add(ticketPrice) // 0.25 + 0.75 = 1
                                      )
                                      .toString()
                              )
                              //   lets solve this maths
                              //

                              resolve()
                          } catch (error) {
                              reject(error)
                          }
                      })
                      //   below we will fire an event
                      const txResponse = await raffle.performUpkeep("0x")
                      const txReceipt = await txResponse.wait(1)
                      const winnerStartingBalance =
                          await accounts[1].getBalance() //as we run run test the winner is always account 1
                      const requestId = txReceipt.events?.[1].args?.requestId
                      await VRFCoordinatorV2Mock.fulfillRandomWords(
                          requestId,
                          raffle.address
                      ) // this will fire WinnerPicked event
                  })
              })
          })
      })
