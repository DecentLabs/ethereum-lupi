var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/testHelper.js');
var lupiHelper = new require('../app/javascripts/LupiHelper.js');
var BigNumber = require('bignumber.js');
var moment = require('moment');

contract("Lupi admin tests", accounts => {

    it('contract should be setup with initial parameters', () => {
        var instance, ownerAddress;
        var requiredBetAmount = new BigNumber( web3.toWei(1));
        var ticketCountLimit = 2;
        var bettingPeriodEnds = 0;
        var feePt = 10000;
        var revealPeriodLength = 14400;

        return lupi.new(requiredBetAmount, ticketCountLimit, bettingPeriodEnds, revealPeriodLength, feePt)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            return instance.getRoundInfo()
        }).then( res => {
            var roundInfo = new lupiHelper.RoundInfo(res);
            assert.equal(roundInfo.state, 0, "state should be 'Betting' (0)");
            assert.equal(roundInfo.requiredBetAmount.toString(), requiredBetAmount,toString(), "requiredBetAmount should be set");
            assert.equal(roundInfo.feePt, feePt, "feePt should be set");
            assert.equal(roundInfo.bettingPeriodEnds, bettingPeriodEnds, "bettingPeriodEnds should be set");
            assert.equal(roundInfo.ticketCountLimit, ticketCountLimit, "ticketCountLimit should be set");
            assert.equal(roundInfo.revealPeriodLength, revealPeriodLength, "revealPeriodLength should be set");
            assert.equal(roundInfo.ticketCount, 0, "ticketCount should be 0");
            assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0");
            assert.equal(roundInfo.feeAmount, 0, "feeAmount should be 0");
            var expGuaranteedPotAmount = requiredBetAmount.times(ticketCountLimit).times( 1 - feePt / 1000000);
            assert.equal(roundInfo.guaranteedPotAmount.toString(), expGuaranteedPotAmount.toString(), "guaranteedPotAmount should be set");
            assert.equal(roundInfo.currentPotAmount, 0, "currentPotAmount should be 0");
            assert.equal(roundInfo.winningTicket, 0, "winningTicket should be 0");
            assert.equal(roundInfo.winningAddress, 0, "winningAddress should be 0");
            assert.equal(roundInfo.winningNumber, 0, "winningNumber should be set");
            assert.equal(roundInfo.revealPeriodEnds, 0, "revealPeriodEnds should be 0");
        });
    });

    it('should be possible to change owner', () => {
        var newOwner = accounts[1];
        var instance, ownerAddress;

        return lupi.new(web3.toWei(1), 2, 0, 60, 10000)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            return instance.setOwner(newOwner, { from: ownerAddress })
        }).then( tx => {
            helper.logGasUse("Change Owner", "setOwner()", "by owner", tx);
            assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
            assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
            assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, newOwner, "owner() should return the new owner");
        });
    }); // should be possible to change owner

    it('should only the current owner change owner', () => {
        var newOwner = accounts[2];
        var instance, ownerAddress;

        return lupi.new(web3.toWei(1), 2, 0, 60, 10000)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            return instance.setOwner(newOwner, { from: newOwner })
        }).then( tx => {
            helper.logGasUse("Change Owner", "setOwner()", "by non owner", tx);
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
        });
    }); // should be possible to change owner

    it('feeAmount should be less than requiredBetAmount', () => {
        return helper.expectThrow( lupi.new(web3.toWei(1), 1, 0, 1, 1000000, { account: accounts[0], gas: 3000000}));
    }); // feeAmount should be less than requiredBetAmount

    it('ticketCount limit should be greater than 0 if bettingPeriodEnds = 0', () => {
        return helper.expectThrow( lupi.new(web3.toWei(1), 0, 60, 60, 10000, { account: accounts[0], gas: 3000000}));
    }); // ticketCount limit should be greater than 0 if bettingPeriodEnds = 0

    it("bettingPeriodEnd should be greater than now if it's not 0", () => {
        var bettingPeriodEnds = moment().utc().unix();
        return helper.expectThrow( lupi.new(web3.toWei(1), 10, bettingPeriodEnds, 60, 10000, { account: accounts[0], gas: 3000000}));
    }); // bettingPeriodEnd should be greater than now if it's not 0

    it('should be possible to schedule startRevealing');
    it('should be possible to schedule revealBet');
    it('should be possible to schedule declareWinner');
    it('should be possible to schedule payWinner');
    it('should be possible to schedule refund');

}); // contract("lupi")
