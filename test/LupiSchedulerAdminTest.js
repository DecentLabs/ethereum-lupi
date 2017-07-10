var lupiScheduler = artifacts.require("./LupiScheduler.sol");
var testHelper = new require('./helpers/testHelper.js');
var lupiSchedulerTestHelper = new require('./helpers/LupiSchedulerTestHelper');
var gas = new require('../app/javascripts/Gas.js');

contract("LupiScheduler Admin tests", accounts => {
    it('LupiScheduler contract should be setup with initial parameters', async function () {
        var instance = await lupiSchedulerTestHelper.newLupiScheduler();
        assert.equal( await instance.oraclizeGasPrice(), gas.lupiScheduler.oraclizeGasPrice, "oraclizeGasPrice should be set" );
        assert.equal( await instance.gasStartRevealingCallBack(), gas.lupiScheduler.startRevealingCallBack.gas, "gasStartRevealing gasStartRevealing should be set" );
        assert.equal( await instance.gasRevealPerTicketCallBack(),gas.lupiScheduler.revealPerTicketCallback.gas, "gasRevealPerTicket should be set" );
        assert.equal( await instance.gasDeclareWinnerBaseCallBack(), gas.lupiScheduler.declareWinnerCallback.gasBase, "gasDeclareWinnerBase should be set" );
        assert.equal( await instance.gasDeclareWinnerPerTicketCallBack(), gas.lupiScheduler.declareWinnerCallback.gasPerGuess, "gasDeclareWinnerPerTicket should be set" );
        assert.equal( await instance.gasRefundPerTicketCallBack(), gas.lupiScheduler.refundPerTicketCallback.gas, "gasRefundPerTicket should be set" );
        assert.equal( await instance.gasPayWinnerCallBack(), gas.lupiScheduler.payWinnerCallback.gas, "gasPayWinner should be set" );
    }); // LupiScheduler contract should be setup with initial parameters

    it('should be possible to change LupiScheduler contract parameters', async function () {
        var instance = await lupiSchedulerTestHelper.newLupiScheduler();
        var gasEstimate = gas.lupiScheduler.setGasParams.gas;
        var tx = await instance.setGasParams( 10, 11, 12, 13, 14, 15, 16, {gas: gasEstimate});
        if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
        testHelper.logGasUse("LupiScheduler Admin", "lupiScheduler.setGasParams()", "by owner", tx);
        assert.equal( await instance.oraclizeGasPrice(), 10, "oraclizeGasPrice should be set" );
        assert.equal( await instance.gasStartRevealingCallBack(), 11, "gasStartRevealing gasStartRevealing should be set" );
        assert.equal( await instance.gasRevealPerTicketCallBack(),12, "gasRevealPerTicket should be set" );
        assert.equal( await instance.gasDeclareWinnerBaseCallBack(), 13, "gasDeclareWinnerBase should be set" );
        assert.equal( await instance.gasDeclareWinnerPerTicketCallBack(), 14, "gasDeclareWinnerPerTicket should be set" );
        assert.equal( await instance.gasRefundPerTicketCallBack(), 15, "gasRefundPerTicket should be set" );
        assert.equal( await instance.gasPayWinnerCallBack(), 16, "gasPayWinner should be set" );
    }); // LupiScheduler contract should be setup with initial parameters);

    it('only the owner should be able to change LupiScheduler contract parameters', async function() {
        var instance = await lupiSchedulerTestHelper.newLupiScheduler();
        var gasEstimate = gas.lupiScheduler.setGasParams.gas;
        var tx = await instance.setGasParams( 10, 11, 12, 13, 14, 15, 16, {from: accounts[1], gas: gasEstimate});
        if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
        testHelper.logGasUse("LupiScheduler Admin", "lupiScheduler.setGasParams()", "by non owner", tx);
        assert.equal( await instance.oraclizeGasPrice(), gas.lupiScheduler.oraclizeGasPrice, "oraclizeGasPrice should be set" );
        assert.equal( await instance.gasStartRevealingCallBack(), gas.lupiScheduler.startRevealingCallBack.gas, "gasStartRevealing gasStartRevealing should be set" );
        assert.equal( await instance.gasRevealPerTicketCallBack(),gas.lupiScheduler.revealPerTicketCallback.gas, "gasRevealPerTicket should be set" );
        assert.equal( await instance.gasDeclareWinnerBaseCallBack(), gas.lupiScheduler.declareWinnerCallback.gasBase, "gasDeclareWinnerBase should be set" );
        assert.equal( await instance.gasDeclareWinnerPerTicketCallBack(), gas.lupiScheduler.declareWinnerCallback.gasPerGuess, "gasDeclareWinnerPerTicket should be set" );
        assert.equal( await instance.gasRefundPerTicketCallBack(), gas.lupiScheduler.refundPerTicketCallback.gas, "gasRefundPerTicket should be set" );
        assert.equal( await instance.gasPayWinnerCallBack(), gas.lupiScheduler.payWinnerCallback.gas, "gasPayWinner should be set" );
    }); //only the owner should be able to change LupiScheduler contract parameters

    it('should be possible to change owner', async function () {
        var newOwner = accounts[1];
        var instance = await lupiSchedulerTestHelper.newLupiScheduler();
        var ownerAddress = await instance.owner();
        var gasEstimate = gas.lupiScheduler.setOwner.gas;
        var tx = await instance.setOwner(newOwner, { from: ownerAddress, gas: gasEstimate });
        if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
        testHelper.logGasUse("LupiScheduler Admin", "lupiScheduler.setOwner()", "by owner", tx);
        assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
        assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
        assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
        var ownerRes = await instance.owner();
        assert.equal(ownerRes, newOwner, "owner() should return the new owner");
    }); // should be possible to change owner

    it('should only the current owner change owner', async function () {
        var newOwner = accounts[2];
        var instance = await lupiSchedulerTestHelper.newLupiScheduler();
        var ownerAddress = await instance.owner();
        var gasEstimate = gas.lupiScheduler.setOwner.gas;
        var tx = await instance.setOwner(newOwner, { from: newOwner, gas: gasEstimate });
        if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
        testHelper.logGasUse("LupiScheduler Admin", "lupiScheduler.setOwner()", "by non owner", tx);
        assert.equal(tx.logs.length, 0, "no event should be emmitted");
        var ownerRes = await instance.owner();
        assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
    }); // should be possible to change owner

});
