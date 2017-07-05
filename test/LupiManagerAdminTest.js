var lupiManager = artifacts.require("./LupiManager.sol");
var lupi = artifacts.require("./Lupi.sol");
var testHelper = new require('./helpers/testHelper.js');
var lupiHelper = new require('../app/javascripts/LupiHelper.js');
var moment = require('moment');
var BigNumber = require('bignumber.js');

contract("LupiManager Admin tests", accounts => {

    it('should be possible to add a game', () => {
        var instance, gameIdx;
        var gameToAdd = "0x2313bdf7f88755aa2c6198af3dd875622a181213";
        return lupiManager.new().then( res => {
            instance = res;
            return instance.addGame(gameToAdd);
        }).then( tx => {
            gameIdx = tx.logs[0].args.gameIdx;
            assert.equal(tx.logs[0].event, "e_GameAdded", "e_GameAdded event should be emmitted");
            assert.equal(tx.logs[0].args.gameIdx.toNumber(), 0, "gameIdx should be set in event");
            assert.equal(tx.logs[0].args.gameAddress, gameToAdd, "new game address should be set in event");
            return instance.games(gameIdx);
        }).then ( res => {
            assert.equal(res, gameToAdd, "new game should be added");
            return instance.getGamesCount();
        }).then ( res => {
            assert.equal(res, 1, "game count should be 1");
        });
    }); // should be possible to add a game

    it('only owner should be able to add a game', () => {
        var instance;
        var gameToAdd = "0x2313bdf7f88755aa2c6198af3dd875622a181213";
        return lupiManager.new().then( res => {
            instance = res;
            return instance.addGame(gameToAdd, { from: accounts[1]});
        }).then( tx => {
            testHelper.logGasUse("LupiManager.addGame()", "addGame()", "", tx);
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.getGamesCount();
        }).then ( res => {
            assert.equal(res, 0, "game count should be 0");
        });
    }); // only owner should be able to add a game

    it('should be possible to create a new game', () => {
        var instance, gameInstance, gameIdx, gameAddress, lupiManagerOwnerAddress;
        var requiredBetAmount = new BigNumber( web3.toWei(1));
        var ticketCountLimit = 2;
        var bettingPeriodLength = 600;
        var feePt = 10000;
        var revealPeriodLength = 14400;

        return lupiManager.new()
        .then( res => {
            instance = res;
            return instance.owner();
        }).then( res => {
            lupiManagerOwnerAddress = res;
            return instance.createGame(requiredBetAmount, ticketCountLimit, bettingPeriodLength,
                 revealPeriodLength, feePt, { gas: 1200000});
        }).then( tx => {
            testHelper.logGasUse("LupiManager", "LupiManager.createGame()", "", tx);
            assert.equal(tx.logs[1].event, "e_GameCreated", "e_GameCreated event should be emmitted");
            gameAddress = tx.logs[1].args.gameAddress;
            gameIdx = tx.logs[2].args.gameIdx;
            assert.equal(tx.logs[2].event, "e_GameAdded", "e_GameAdded event should be emmitted");
            assert.equal(tx.logs[2].args.gameIdx, 0, "gameIdx should be set in event");
            assert.equal(tx.logs[1].args.gameAddress, gameAddress, "new game address should be set in event");
            assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
            assert.equal(tx.logs[0].args.current, lupiManagerOwnerAddress, "new owner should be set in event");
            return instance.games(gameIdx);
        }).then ( res => {
            assert.equal(res, gameAddress, "new game should be added");
            return instance.getGamesCount();
        }).then ( res => {
            assert.equal(res, 1, "game count should be 1");
            gameInstance = lupi.at(gameAddress);
            return gameInstance.owner();
        }).then( res => {
            assert.equal(res, lupiManagerOwnerAddress, "new game owner should be the same as lupiManager's owner");
            return gameInstance.getRoundInfo();
        }).then( res => {
            var roundInfo = new lupiHelper.RoundInfo(res);
            assert.equal(roundInfo.state, 0, "new game state should be betting");
            assert.equal(roundInfo.requiredBetAmount.toString(), requiredBetAmount,toString(), "new game requiredBetAmount should be set");
            assert.equal(roundInfo.ticketCountLimit, ticketCountLimit, "new game ticketCountLimit should be set");
            assert(roundInfo.bettingPeriodEnds >= moment().utc().unix() + bettingPeriodLength - 1, "bettingPeriodEnds end should be at least bettingPeriodLength + now - 1sec");
            assert(roundInfo.bettingPeriodEnds <= moment().utc().unix() + bettingPeriodLength + 10, "bettingPeriodEnds end should be at most bettingPeriodLength + now + 1sec");
            assert.equal(roundInfo.revealPeriodLength, revealPeriodLength, "new game revealPeriodLength should be set");
            assert.equal(roundInfo.feePt, feePt, "new game feePt should be set");
        });
    }); // should be possible to create a new game

    it('only owner should be able to create a new game', () => {
        var instance;
        return lupiManager.new().then( res => {
            instance = res;
            return instance.createGame(1,1,0,1,1, { from: accounts[1]});
        }).then( tx => {
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.getGamesCount();
        }).then ( res => {
            assert.equal(res, 0, "game count should be 0");
        });
    }); // only owner should be able to add a game

    it('should be possible to change owner', () => {
        var newOwner = accounts[1];
        var res, ownerAddress;
        return lupiManager.new().then( res => {
            instance = res;
            return instance.owner();
        }).then( res => {
            ownerAddress = res;
            return instance.setOwner(newOwner, { from: ownerAddress })
        }).then( tx => {
            assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
            assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
            assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, newOwner, "owner() should return the new owner");
            ownerAddress = newOwner;
        });
    }); // should be possible to change owner

    it('should only the current owner change owner', () => {
        var newOwner = accounts[2];
        var res, ownerAddress;
        return lupiManager.new().then( res => {
            instance = res;
            return instance.owner();
        }).then( res => {
            ownerAddress = res;
            return instance.setOwner(newOwner, { from: newOwner })
        }).then( tx => {
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
        });
    }); // should be possible to change owner

});
