pragma solidity ^0.4.11;

import "./Owned.sol";

contract LupiManager is owned {

    address[] public games;

    function getGamesCount() public constant returns (uint ct) {
        return games.length;
    }

    event e_GameAdded(uint indexed gameIdx, address gameAddress);
    function addGame(address _address) onlyOwner returns (uint idx) {
        idx = games.push( _address)  - 1;
        e_GameAdded(idx, _address);
        return idx;
    }

}
