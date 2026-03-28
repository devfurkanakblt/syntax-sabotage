// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SyntaxSabotagePool
/// @notice Match-scoped staking pool for Syntax Sabotage hackathon gameplay.
/// @dev State is keyed by matchId to reduce shared-slot contention under high throughput.
contract SyntaxSabotagePool is Ownable, ReentrancyGuard {
    struct MatchPool {
        bool exists;
        bool finalized;
        uint256 entryFee;
        uint256 totalPot;
        uint256 participantCount;
    }

    mapping(bytes32 => MatchPool) private pools;
    mapping(bytes32 => mapping(address => bool)) public hasJoined;

    event MatchPoolCreated(bytes32 indexed matchId, uint256 entryFee);
    event MatchJoined(bytes32 indexed matchId, address indexed player, uint256 amount);
    event MatchFinalized(bytes32 indexed matchId, address[] winners, uint256 totalPot, uint256 payoutPerWinner);

    constructor(address owner_) Ownable(owner_) {}

    function createMatchPool(bytes32 matchId, uint256 entryFee) external onlyOwner {
        require(matchId != bytes32(0), "INVALID_MATCH_ID");
        require(entryFee > 0, "ENTRY_FEE_ZERO");
        require(!pools[matchId].exists, "POOL_EXISTS");

        pools[matchId] = MatchPool({
            exists: true,
            finalized: false,
            entryFee: entryFee,
            totalPot: 0,
            participantCount: 0
        });

        emit MatchPoolCreated(matchId, entryFee);
    }

    function joinMatch(bytes32 matchId) external payable nonReentrant {
        MatchPool storage pool = pools[matchId];
        require(pool.exists, "POOL_NOT_FOUND");
        require(!pool.finalized, "POOL_FINALIZED");
        require(!hasJoined[matchId][msg.sender], "ALREADY_JOINED");
        require(msg.value == pool.entryFee, "INVALID_STAKE");

        hasJoined[matchId][msg.sender] = true;
        pool.totalPot += msg.value;
        pool.participantCount += 1;

        emit MatchJoined(matchId, msg.sender, msg.value);
    }

    function finalizeMatch(bytes32 matchId, address[] calldata winners) external onlyOwner nonReentrant {
        MatchPool storage pool = pools[matchId];
        require(pool.exists, "POOL_NOT_FOUND");
        require(!pool.finalized, "POOL_FINALIZED");
        require(winners.length > 0, "NO_WINNERS");

        uint256 totalPot = pool.totalPot;
        require(totalPot > 0, "EMPTY_POOL");

        for (uint256 i = 0; i < winners.length; i++) {
            require(hasJoined[matchId][winners[i]], "WINNER_NOT_PARTICIPANT");
        }

        pool.finalized = true;

        uint256 payoutPerWinner = totalPot / winners.length;
        uint256 remainder = totalPot % winners.length;

        for (uint256 i = 0; i < winners.length; i++) {
            uint256 payout = payoutPerWinner;
            if (i == 0) {
                payout += remainder;
            }

            (bool ok, ) = winners[i].call{value: payout}("");
            require(ok, "PAYOUT_FAILED");
        }

        emit MatchFinalized(matchId, winners, totalPot, payoutPerWinner);
    }

    function poolExists(bytes32 matchId) external view returns (bool) {
        return pools[matchId].exists;
    }

    function getPool(bytes32 matchId) external view returns (MatchPool memory) {
        return pools[matchId];
    }
}
