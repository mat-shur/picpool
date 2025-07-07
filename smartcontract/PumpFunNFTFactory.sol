// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts@4.9.3/access/Ownable.sol";
import "./PumpFunNFTCollection.sol";

contract PumpFunNFTFactory is Ownable {
    mapping(uint256 => address) public listings;
    uint256 public nextListingId;
    address public immutable projectPool;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed collection,
        uint256 startPrice,
        uint256 finalPrice,
        uint256 maxSupply,
        uint256 initialMintCount
    );

    constructor(address _projectPool) {
        require(_projectPool != address(0), "bad pool");
        projectPool = _projectPool;
    }

    function createListing(
        uint256 startPrice,
        uint256 finalPrice,
        uint256 maxSupply,
        string  memory name_,
        string  memory symbol_,
        string  memory imageBase64,
        uint256 initialMintCnt
    ) external payable {
        if (initialMintCnt > 10) revert("premint<=10");
        uint256 need = startPrice * initialMintCnt;
        if (msg.value < need) revert("need ether for premint");

        PumpFunNFTCollection col = new PumpFunNFTCollection{ value: msg.value }(
            startPrice,
            finalPrice,
            maxSupply,
            name_,
            symbol_,
            imageBase64,
            msg.sender,
            projectPool,
            initialMintCnt
        );

        listings[nextListingId] = address(col);
        emit ListingCreated(
            nextListingId,
            address(col),
            startPrice,
            finalPrice,
            maxSupply,
            initialMintCnt
        );
        unchecked { ++nextListingId; }
    }

}