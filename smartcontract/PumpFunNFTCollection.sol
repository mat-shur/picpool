// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts@4.9.3/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@4.9.3/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.3/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.3/token/common/ERC2981.sol";
import "@openzeppelin/contracts@4.9.3/utils/Strings.sol";
import "@openzeppelin/contracts@4.9.3/utils/Base64.sol";
import "@openzeppelin/contracts@4.9.3/utils/Address.sol";
import "@openzeppelin/contracts@4.9.3/utils/math/Math.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";


contract PumpFunNFTCollection is ERC721, Ownable, ReentrancyGuard, ERC2981 {
    using Address for address payable;
    using Strings  for uint256;
    using PRBMathUD60x18 for uint256;

    struct Listing {
        uint256 currentPrice;
        uint256 totalMinted;
        uint256 totalBurned;
        uint256 nextTokenId;
        bool    closed;
        string  imageBase64;
    }

    struct Snap {
        uint40   t;        
        uint152  p;       
        uint24   s;       
        address  trader;   
        bool     isBuy;   
    }

    uint256 public immutable startPrice;
    uint256 public immutable stepFactor; 
    uint256 public immutable maxSupply;

    Listing public listing;

    Snap[256] private recent;
    uint8 public snapCount;
    uint8 private snapHead;
    address public immutable projectPool;

    event PriceSnap(uint40 indexed blockNo, uint40 time, uint24 supply, uint152 price); 
    event Withdraw(address indexed to, uint256 amount);

    event Minted(address indexed buyer, uint256 time, uint256 tokenId);
    event Burned(address indexed seller, uint256 time, uint256 tokenId, uint256 payout);

    error TradingClosed();
    error SoldOut();
    error ExceedsSlippage();
    error InsufficientPayment();
    error NotOwner();
    error NothingToWithdraw();

    constructor(
        uint256 _startPrice,
        uint256 _finalPrice,
        uint256 _maxSupply,
        string  memory _name,
        string  memory _symbol,
        string  memory _imageBase64,
        address _collectionOwner,
        address _projectPool,
        uint256 _initialMintCount
    ) ERC721(_name, _symbol) payable {
        require(_maxSupply > 1,           "supply>1");
        require(_finalPrice > _startPrice,"final>start");
        require(_initialMintCount <= 10,  "premint<=10");
        require(_projectPool != address(0), "bad pool");

        projectPool = _projectPool;
        transferOwnership(_collectionOwner);
        _setDefaultRoyalty(_collectionOwner, 100); // 1 %

        uint256 ratioQ18 = Math.mulDiv(_finalPrice, 1e18, _startPrice, Math.Rounding.Up);
        uint256 inv      = PRBMathUD60x18.fromUint(1).div(PRBMathUD60x18.fromUint(_maxSupply - 1));
        uint256 rQ18     = ratioQ18.pow(inv);

        startPrice = _startPrice;
        stepFactor = rQ18;
        maxSupply  = _maxSupply;

        listing = Listing({
            currentPrice : _startPrice,
            totalMinted  : 0,
            totalBurned  : 0,
            nextTokenId  : 0,
            closed       : false,
            imageBase64  : _imageBase64
        });

        if (_initialMintCount > 0) {
            uint256 price = _startPrice;
            for (uint256 i; i < _initialMintCount;) {
                uint256 tokenId = _mintCore(_collectionOwner);
                price = Math.mulDiv(price, stepFactor, 1e18, Math.Rounding.Up);

                _pushSnap(Snap({
                    t: uint40(block.timestamp),
                    p: uint152(listing.currentPrice),
                    s: uint24(currentSupply()),
                    trader: _collectionOwner,
                    isBuy: true        
                }));

                listing.currentPrice = price;
                
                emit Minted(_collectionOwner, block.timestamp, tokenId);
                unchecked { ++i; }
            }
            uint256 due = _startPrice * _initialMintCount;
            if (msg.value > due) payable(_collectionOwner).sendValue(msg.value - due);
        }
    }

    function currentSupply() public view returns (uint256) {
        return listing.totalMinted - listing.totalBurned;
    }

    function getCurrentPrice() external view returns (uint256) {
        return listing.currentPrice;
    }

    function getImage() external view returns (string memory) {
        return listing.imageBase64;
    }

    function isSoldOut() external view returns (bool) {
        return listing.closed;
    }

    function saleState()
        external
        view
        returns (uint256 _price, uint256 _minted, uint256 _burned, bool _closed)
    {
        return (listing.currentPrice, listing.totalMinted, listing.totalBurned, listing.closed);
    }

    function _pushSnap(Snap memory s) private {
        recent[snapHead] = s;
        snapHead = snapHead + 1;
        if (snapHead == 256) snapHead = 0;
        if (snapCount < 256) snapCount++;
    }

    function getRecentSnaps() external view returns (Snap[] memory out) {
        out = new Snap[](snapCount);
        for (uint8 i; i < snapCount; ++i) {
            uint8 idx = uint8(
                (uint16(snapHead) + 256 - uint16(snapCount) + uint16(i)) % 256
            );
            out[i] = recent[idx];
        }
    }

    function mint(uint256 maxAcceptablePrice) external payable nonReentrant {
        if (listing.closed) revert TradingClosed();
        if (currentSupply() >= maxSupply) revert SoldOut();

        uint256 price = listing.currentPrice;
        if (price > maxAcceptablePrice) revert ExceedsSlippage();
        if (msg.value < price) revert InsufficientPayment();

        uint256 tokenId = _mintCore(msg.sender);

        _pushSnap(Snap({
            t: uint40(block.timestamp),
            p: uint152(listing.currentPrice),
            s: uint24(currentSupply()),
            trader: msg.sender,
            isBuy: true  
        }));

        listing.currentPrice = Math.mulDiv(price, stepFactor, 1e18, Math.Rounding.Up);
        
        emit Minted(msg.sender, block.timestamp, tokenId);
        if (msg.value > price) payable(msg.sender).sendValue(msg.value - price);
    }

    function burn(uint256 tokenId, uint256 minAcceptablePayout) public nonReentrant {
        if (listing.closed) revert TradingClosed();
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();

        uint256 payout = Math.mulDiv(listing.currentPrice, 1e18, stepFactor, Math.Rounding.Down);
        if (payout < minAcceptablePayout) revert ExceedsSlippage();

        _burn(tokenId);
        listing.totalBurned++;
        listing.currentPrice = payout;

        _pushSnap(Snap({
            t: uint40(block.timestamp),
            p: uint152(listing.currentPrice),
            s: uint24(currentSupply()),
            trader: msg.sender,
            isBuy: false   
        }));

        emit Burned(msg.sender, block.timestamp, tokenId, payout);
        payable(msg.sender).sendValue(payout);

        if (listing.closed && currentSupply() < maxSupply) listing.closed = false;
    }

    function withdrawRevenue() external onlyOwner nonReentrant {
        if (!listing.closed) revert TradingClosed();
        uint256 bal = address(this).balance;
        if (bal == 0) revert NothingToWithdraw();

        uint256 share = bal / 10;
        payable(owner()).sendValue(bal - share);
        payable(projectPool).sendValue(share);
        emit Withdraw(owner(), bal - share);
        emit Withdraw(projectPool, share);
    }

    function _mintCore(address to) internal returns (uint256 tokenId) {
        tokenId = listing.nextTokenId++;
        _safeMint(to, tokenId);
        listing.totalMinted++;
        listing.closed = (currentSupply() == maxSupply);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "no token");
        string memory json = string(
            abi.encodePacked(
                '{"name":"', name(), " #", tokenId.toString(), '",',
                '"description":"Picpool listing",',
                '"image":"', listing.imageBase64, '"}'
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    mapping(address => uint256[]) private bag;
    mapping(uint256 => uint256)  private indexInBag;

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256
    ) internal override {
        if (from != address(0)) {              
            uint256 i = indexInBag[tokenId];
            uint256 last = bag[from][bag[from].length - 1];
            bag[from][i] = last;
            indexInBag[last] = i;
            bag[from].pop();
        }
        if (to != address(0)) {                     
            indexInBag[tokenId] = bag[to].length;
            bag[to].push(tokenId);
        }
    }

    function lastTokenOf(address owner) public view returns (uint256) {
        uint256 n = bag[owner].length;
        require(n > 0, "no NFT");
        return bag[owner][n - 1];
    }

    function burnLast(uint256 minAcceptablePayout) external {
        uint256 id = lastTokenOf(msg.sender);
        burn(id, minAcceptablePayout);             
    }

    function supportsInterface(bytes4 iid) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(iid);
    }

    function previewBurnPayout() external view returns (uint256) {
        return Math.mulDiv(listing.currentPrice, 1e18, stepFactor, Math.Rounding.Down);
    }
}
