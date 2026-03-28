// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SyntaxSabotagePool
/// @notice Match-scoped staking pool for Syntax Sabotage hackathon gameplay.
/// @dev State is keyed by matchId to reduce shared-slot contention under high throughput.
contract SyntaxSabotagePool is Ownable, ReentrancyGuard, ERC721 {
    enum CrewBadgeType {
        DEBUGGER,
        DE_IMPOSTORER
    }

    struct MatchPool {
        bool exists;
        bool finalized;
        uint256 entryFee;
        uint256 totalPot;
        uint256 participantCount;
    }

    mapping(bytes32 => MatchPool) private pools;
    mapping(bytes32 => mapping(address => bool)) public hasJoined;
    mapping(uint256 => CrewBadgeType) private badgeByTokenId;

    uint256 private nextTokenId = 1;

    event MatchPoolCreated(bytes32 indexed matchId, uint256 entryFee);
    event MatchJoined(bytes32 indexed matchId, address indexed player, uint256 amount);
    event MatchFinalized(bytes32 indexed matchId, address[] winners, uint256 totalPot, uint256 payoutPerWinner);
    event CrewBadgeMinted(
        bytes32 indexed matchId,
        address indexed recipient,
        uint256 indexed tokenId,
        CrewBadgeType badgeType,
        string label
    );

    constructor(address owner_) Ownable(owner_) ERC721("Syntax Sabotage Crew Badge", "SSCB") {}

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
        _finalizeMatch(matchId, winners);
    }

    function finalizeMatchAndMintCrewBadge(
        bytes32 matchId,
        address[] calldata winners,
        CrewBadgeType badgeType
    ) external onlyOwner nonReentrant {
        _finalizeMatch(matchId, winners);

        for (uint256 i = 0; i < winners.length; i++) {
            uint256 tokenId = nextTokenId;
            nextTokenId += 1;

            badgeByTokenId[tokenId] = badgeType;
            _safeMint(winners[i], tokenId);

            emit CrewBadgeMinted(matchId, winners[i], tokenId, badgeType, _badgeLabel(badgeType));
        }
    }

    function mintDemoCrewBadges(address[] calldata recipients, CrewBadgeType badgeType) external onlyOwner {
        require(recipients.length > 0, "NO_RECIPIENTS");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "INVALID_RECIPIENT");

            uint256 tokenId = nextTokenId;
            nextTokenId += 1;

            badgeByTokenId[tokenId] = badgeType;
            _safeMint(recipients[i], tokenId);

            emit CrewBadgeMinted(bytes32(0), recipients[i], tokenId, badgeType, _badgeLabel(badgeType));
        }
    }

    function _finalizeMatch(bytes32 matchId, address[] calldata winners) private {
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

    function badgeTypeOf(uint256 tokenId) external view returns (CrewBadgeType) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_NOT_MINTED");
        return badgeByTokenId[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "TOKEN_NOT_MINTED");

        CrewBadgeType badgeType = badgeByTokenId[tokenId];

        if (badgeType == CrewBadgeType.DE_IMPOSTORER) {
            return "data:application/json;utf8,{\"name\":\"Syntax Sabotage - de-impostorer\",\"description\":\"Crew-only soulbound achievement NFT for exposing the imposter in time.\",\"image\":\"http://localhost:3000/nft-images/de-impostorer.png\",\"attributes\":[{\"trait_type\":\"Badge\",\"value\":\"de-impostorer\"},{\"trait_type\":\"Transferability\",\"value\":\"Soulbound\"}]}";
        }

        return "data:application/json;utf8,{\"name\":\"Syntax Sabotage - debugger\",\"description\":\"Crew-only soulbound achievement NFT for fixing the code in time.\",\"image\":\"http://localhost:3000/nft-images/debugger.png\",\"attributes\":[{\"trait_type\":\"Badge\",\"value\":\"debugger\"},{\"trait_type\":\"Transferability\",\"value\":\"Soulbound\"}]}";
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("SOULBOUND");
        }

        return super._update(to, tokenId, auth);
    }

    function _badgeLabel(CrewBadgeType badgeType) private pure returns (string memory) {
        if (badgeType == CrewBadgeType.DE_IMPOSTORER) {
            return "de-impostorer";
        }

        return "debugger";
    }

    function poolExists(bytes32 matchId) external view returns (bool) {
        return pools[matchId].exists;
    }

    function getPool(bytes32 matchId) external view returns (MatchPool memory) {
        return pools[matchId];
    }
}
