var lupiManager = artifacts.require("./LupiManager.sol");
var lupi = artifacts.require("./Lupi.sol");
var testHelper = new require('./helpers/testHelper.js');
var lupiHelper = new require('../app/javascripts/LupiHelper.js');
var moment = require('moment');
var BigNumber = require('bignumber.js');

contract("LupiManager Admin tests", accounts => {

    it('should be possible to add a game', async function () {
        var gameToAdd = "0x2313bdf7f88755aa2c6198af3dd875622a181213";
        var instance = await lupiManager.new();
        var tx = await instance.addGame(gameToAdd);
        var gameIdx = tx.logs[0].args.gameIdx;
        assert.equal(tx.logs[0].event, "e_GameAdded", "e_GameAdded event should be emmitted");
        assert.equal(tx.logs[0].args.gameIdx.toNumber(), 0, "gameIdx should be set in event");
        assert.equal(tx.logs[0].args.gameAddress, gameToAdd, "new game address should be set in event");
        var newGameAddress = await instance.games(gameIdx);
        assert.equal(newGameAddress, gameToAdd, "new game should be added");
        var gameCt = await instance.getGamesCount();
        assert.equal(gameCt, 1, "game count should be 1");
    }); // should be possible to add a game

    it('only owner should be able to add a game', async function () {
        var gameToAdd = "0x2313bdf7f88755aa2c6198af3dd875622a181213";
        var instance = await lupiManager.new();
        var tx = await instance.addGame(gameToAdd, { from: accounts[1]});
        testHelper.logGasUse("LupiManager.addGame()", "addGame()", "", tx);
        assert.equal(tx.logs.length, 0, "no event should be emmitted");
        var gameCt = await instance.getGamesCount();
        assert.equal(gameCt, 0, "game count should be 0");
    }); // only owner should be able to add a game

    it('should be possible to create a new game', async function () {
        var requiredBetAmount = new BigNumber( web3.toWei(1));
        var ticketCountLimit = 2;
        var bettingPeriodLength = 600;
        var feePt = 10000;
        var revealPeriodLength = 14400;

        var instance = await lupiManager.new();
        var lupiManagerOwnerAddress = await instance.owner();
        var tx = await instance.createGame(requiredBetAmount, ticketCountLimit, bettingPeriodLength,
                 revealPeriodLength, feePt, { gas: 1200000});
        testHelper.logGasUse("LupiManager", "LupiManager.createGame()", "", tx);
        assert.equal(tx.logs[1].event, "e_GameCreated", "e_GameCreated event should be emmitted");
        var gameAddress = tx.logs[1].args.gameAddress;
        var gameIdx = tx.logs[2].args.gameIdx;
        assert.equal(tx.logs[2].event, "e_GameAdded", "e_GameAdded event should be emmitted");
        assert.equal(tx.logs[2].args.gameIdx, 0, "gameIdx should be set in event");
        assert.equal(tx.logs[1].args.gameAddress, gameAddress, "new game address should be set in event");
        assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
        assert.equal(tx.logs[0].args.current, lupiManagerOwnerAddress, "new owner should be set in event");
        var newGameAddress = await instance.games(gameIdx);
        assert.equal(newGameAddress, gameAddress, "new game should be added");
        var gameCt = await instance.getGamesCount();
        assert.equal(gameCt, 1, "game count should be 1");
        var gameInstance = lupi.at(gameAddress);
        var gameOwner = await gameInstance.owner();
        assert.equal(gameOwner, lupiManagerOwnerAddress, "new game owner should be the same as lupiManager's owner");
        var roundInfo = new lupiHelper.RoundInfo( await gameInstance.getRoundInfo() );
        assert.equal(roundInfo.state, 0, "new game state should be betting");
        assert.equal(roundInfo.requiredBetAmount.toString(), requiredBetAmount,toString(), "new game requiredBetAmount should be set");
        assert.equal(roundInfo.ticketCountLimit, ticketCountLimit, "new game ticketCountLimit should be set");
        assert(roundInfo.bettingPeriodEnds >= moment().utc().unix() + bettingPeriodLength - 1, "bettingPeriodEnds end should be at least bettingPeriodLength + now - 1sec");
        assert(roundInfo.bettingPeriodEnds <= moment().utc().unix() + bettingPeriodLength + 10, "bettingPeriodEnds end should be at most bettingPeriodLength + now + 1sec");
        assert.equal(roundInfo.revealPeriodLength, revealPeriodLength, "new game revealPeriodLength should be set");
        assert.equal(roundInfo.feePt, feePt, "new game feePt should be set");
    }); // should be possible to create a new game

    it('only owner should be able to create a new game', async function () {
        var instance = await lupiManager.new();
        var tx = await instance.createGame(1,1,0,1,1, { from: accounts[1]});
        assert.equal(tx.logs.length, 0, "no event should be emmitted");
        var gameCt = await instance.getGamesCount();
        assert.equal(gameCt, 0, "game count should be 0");
    }); // only owner should be able to add a game

    it('should be possible to change owner', async function () {
        var newOwner = accounts[1];
        var instance = await lupiManager.new();
        var ownerAddress = await instance.owner();
        var tx = await instance.setOwner(newOwner, { from: ownerAddress });
        assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
        assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
        assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
        var ownerRes = await instance.owner();
        assert.equal(ownerRes, newOwner, "owner() should return the new owner");
    }); // should be possible to change owner

    it('should only the current owner change owner', async function () {
        var newOwner = accounts[2];
        var instance = await lupiManager.new();
        var ownerAddress = await instance.owner();
        var tx = await instance.setOwner(newOwner, { from: newOwner });
        assert.equal(tx.logs.length, 0, "no event should be emmitted");
        var ownerRes = await instance.owner();
        assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
    }); // should be possible to change owner

});
