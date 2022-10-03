// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

error Raffle__NotEnoughEtherEntered();
error Raffle__TransferFailed(address recipient, uint256 amount);
error Raffle__RaffleNotOpen();
error Raffle__UpKeepNotNeeded(
    uint256 currrentBalance,
    uint256 numPlayers,
    uint256 raffleState
);

/**@title A sample Raffle Contract
 * @author Anmol Pokhrel
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF Version 2
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    // Type Declaration
    enum RaffleState {
        OPEN,
        CALCULATING
    } // uint256 1=OPEN, 2=CLOSED, 3=CALCULATING

    // state variables

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATION = 3;
    uint32 private constant NUM_WORDS = 1;

    uint256 private immutable i_ticketPrice;
    address payable[] private s_players;

    // Lottery variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;
    // events

    event RaffleEntered(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    // Constructor

    constructor(
        address VRFCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint256 interval,
        uint256 ticketPrice,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(VRFCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(VRFCoordinatorV2);
        i_ticketPrice = ticketPrice;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_ticketPrice) {
            revert Raffle__NotEnoughEtherEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }
        s_players.push(payable(msg.sender));
        //   Emit an event here when we update a dynamic array or mapping
        emit RaffleEntered(msg.sender);
    }

    /**
     * @dev This is the function that Chainlink Keeper will call
     * they look for the upKeepNeeded function to return true
     * The following should be true in order to return true:
     * 1.our time interval should have passed
     * 2. The raffle should have at least 1 player and have some money in it
     * 3. Our subscription should be funded with eth
     * 4. The raffle should be in a open state
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData*/
        )
    {
        bool isOpen = s_raffleState == RaffleState.OPEN;
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = isOpen && timePassed && hasPlayers && hasBalance;
        return (upkeepNeeded, "0x0"); // can we comment this out?

        // (block.timestamp - s_lastTimeStamp) >= i_interval;
    }

    // chainlink nodes will automatically call performUpkeep when checkUpkeep returns true
    function performUpkeep(
        bytes calldata /* performData*/
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Raffle__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        s_raffleState = RaffleState.CALCULATING;

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATION,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
        // Request the random number
        // Do something with the random number
    }

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length; //picks a random number between 0 and the number of players
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed(recentWinner, address(this).balance);
        }
        emit WinnerPicked(recentWinner);
    }

    // View / Pure functions
    function getTicketPrice() public view returns (uint256) {
        return i_ticketPrice;
    }

    function getPlayer(uint256 index) public view returns (address payable) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    // NUM_WORDS is a constant so we can use it in the pure function beacause it is not stored in the storage
    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmation() public pure returns (uint16) {
        return REQUEST_CONFIRMATION;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
