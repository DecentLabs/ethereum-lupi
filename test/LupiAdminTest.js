var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/testHelper.js');
var lupiHelper = new require('../app/javascripts/LupiHelper.js');
var BigNumber = require('bignumber.js');
var moment = require('moment');

contract("Lupi admin tests", accounts => {

    it('contract should be setup with initial parameters', async function () {
        var requiredBetAmount = new BigNumber( web3.toWei(1));
        var ticketCountLimit = 2;
        var bettingPeriodLength = 20;
        var feePt = 10000;
        var revealPeriodLength = 14400;

        var instance = await lupi.new(requiredBetAmount, ticketCountLimit, bettingPeriodLength, revealPeriodLength, feePt);
        var ownerAddress = await instance.owner();
        var roundInfo = new lupiHelper.RoundInfo( await instance.getRoundInfo() );
        assert.equal(roundInfo.state, 0, "state should be 'Betting' (0)");
        assert.equal(roundInfo.requiredBetAmount.toString(), requiredBetAmount,toString(), "requiredBetAmount should be set");
        assert.equal(roundInfo.feePt, feePt, "feePt should be set");
        assert(roundInfo.bettingPeriodEnds >= moment().utc().unix() + bettingPeriodLength - 1, "bettingPeriodEnds end should be at least bettingPeriodLength + now - 1sec");
        assert(roundInfo.bettingPeriodEnds <= moment().utc().unix() + bettingPeriodLength + 10, "bettingPeriodEnds end should be at most bettingPeriodLength + now + 1sec");
        assert.equal(roundInfo.ticketCountLimit, ticketCountLimit, "ticketCountLimit should be set");
        assert.equal(roundInfo.revealPeriodLength, revealPeriodLength, "revealPeriodLength should be set");
        assert.equal(roundInfo.ticketCount, 0, "ticketCount should be 0");
        assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0");
        assert.equal(roundInfo.feeAmount, 0, "feeAmount should be 0");
        assert.equal(roundInfo.guaranteedPotAmount.toString(), "0", "guaranteedPotAmount should be set");
        assert.equal(roundInfo.currentPotAmount, 0, "currentPotAmount should be 0");
        assert.equal(roundInfo.winningTicket, 0, "winningTicket should be 0");
        assert.equal(roundInfo.winningAddress, 0, "winningAddress should be 0");
        assert.equal(roundInfo.winningNumber, 0, "winningNumber should be set");
        assert.equal(roundInfo.revealPeriodEnds, 0, "revealPeriodEnds should be 0");
    });

    it('should be possible to change owner', async function () {
        var newOwner = accounts[1];
        var instance = await lupi.new(web3.toWei(1), 2, 0, 60, 10000);
        var ownerAddress = await instance.owner();
        var tx = await instance.setOwner(newOwner, { from: ownerAddress })
        helper.logGasUse("Change Owner", "setOwner()", "by owner", tx);
        assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
        assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
        assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
        var ownerRes = await instance.owner();
        assert.equal(ownerRes, newOwner, "owner() should return the new owner");
    }); // should be possible to change owner

    it('should only the current owner change owner', async function () {
        var newOwner = accounts[2];

        var instance = await lupi.new(web3.toWei(1), 2, 0, 60, 10000);
        var ownerAddress = await instance.owner();
        var tx = await instance.setOwner(newOwner, { from: newOwner })
        helper.logGasUse("Change Owner", "setOwner()", "by non owner", tx);
        assert.equal(tx.logs.length, 0, "no event should be emmitted");
        var ownerRes = await instance.owner();
        assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
    }); // should be possible to change owner

    it('feeAmount should be less than requiredBetAmount', async function () {
        return helper.expectThrow( lupi.new(web3.toWei(1), 1, 0, 1, 1000000, { account: accounts[0], gas: 3000000}));
    }); // feeAmount should be less than requiredBetAmount

    it('ticketCount limit should be greater than 0 if bettingPeriodLength = 0', () => {
        return helper.expectThrow( lupi.new(web3.toWei(1), 0, 0, 60, 10000, { account: accounts[0], gas: 3000000}));
    }); // ticketCount limit should be greater than 0 if bettingPeriodEnds = 0

    it('should be possible to schedule startRevealing');
    it('should be possible to schedule revealBet');
    it('should be possible to schedule declareWinner');
    it('should be possible to schedule payWinner');
    it('should be possible to schedule refund');

}); // contract("lupi")
