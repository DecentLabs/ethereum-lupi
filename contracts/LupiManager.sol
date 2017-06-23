pragma solidity ^0.4.11;

import "./Owned.sol";
import "./Lupi.sol";

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

    event e_GameCreated(address gameAddress);
    function createGame(uint _requiredBetAmount, uint _ticketCountLimit,
         uint _revealPeriodLength, uint _feePt) onlyOwner returns (uint gameIdx, address gameAddress) {
        gameAddress = new Lupi(_requiredBetAmount, _ticketCountLimit, _revealPeriodLength, _feePt);
        Lupi gameInstance = Lupi(gameAddress);
        gameInstance.setOwner(owner);
        e_GameCreated(gameAddress);
        gameIdx = addGame(gameAddress);
        return (gameIdx, gameAddress);
    }

}
