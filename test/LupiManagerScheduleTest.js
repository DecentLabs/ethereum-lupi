require('babel-polyfill');
var lupiManager = artifacts.require("./LupiManager.sol");
var lupi = artifacts.require("./Lupi.sol");
var lupiHelper = new require('../app/javascripts/LupiHelper.js');
var testHelper = new require('./helpers/testHelper.js');
var moment = require('moment');

const ORACLIZE_CB_TRESHHOLD = 1; // extra secs to wait in the test which wait for Oraclize  callback
var lupiManagerInstance, lupiManagerOwner;
var CB_EXTRA_SECS, START_REVEALING, SUCCESS_CB; // constants coming from LupiManager contract

before( done => {
    new Promise( async function (resolve, reject) {
        lupiManagerInstance = await lupiManager.new();
        var x = await lupiManagerInstance.CB_EXTRA_SECS();
        CB_EXTRA_SECS = parseInt( x.valueOf() );
        START_REVEALING = await lupiManagerInstance.START_REVEALING();
        SUCCESS_CB = await lupiManagerInstance.SUCCESS_CB();
        lupiManagerOwner = await lupiManagerInstance.owner();
        resolve();
    }).then( res => {
     done()
    });
}); // before()

contract("LupiManager schedule tests", accounts => {

    // this is a prerequisite by the other tests
    it("should be possible to send money to lupiManager", done => {
        new Promise( async function (resolve, reject) {
            var balanceBefore = web3.eth.getBalance(lupiManagerInstance.address)
            var toSend = web3.toWei( 5);
            res = await lupiManagerInstance.sendTransaction( {from: accounts[0], value: toSend })
            var balanceAfter = web3.fromWei( web3.eth.getBalance(lupiManagerInstance.address)).toString();
            assert.equal(balanceAfter, web3.fromWei(balanceBefore + toSend).toString(), "contract balance should be set after sending money");
            resolve();
        }).then( res => {
         done()
        });
    });

    it("should be possible to schedule startRevealing when bettingPeriodEnds is set", async function() {
        var testCaseName = "startRevealing 1";
        var bettingPeriodLength = 1;
        var tx = await lupiManagerInstance.createGame( web3.toWei(1), 3, bettingPeriodLength, 60, 20000)
        var gameInstance = lupi.at(tx.logs[1].args.gameAddress);
        tx = await lupiManagerInstance.scheduleStartRevealing(
                gameInstance.address, lupiHelper.GAS.startRevealingCallBack.gas,
                { gas: lupiHelper.GAS.scheduleStartRevealing.gas});
        queryId = tx.logs[0].args.queryId;
        testHelper.logGasUse(testCaseName,"lupiManager.scheduleStartRevealing()", "", tx);
        assert.equal( typeof queryId, "string", "scheduleStartRevealing should return a queryID");
        assert.equal( tx.logs[0].event, "e_startRevealingScheduled", "scheduleStartRevealing should emmit e_startRevealingScheduled event");
        var bettingPeriodEnds = moment().utc().unix() + bettingPeriodLength + CB_EXTRA_SECS;
        var res = await testHelper.waitForTimeStamp(bettingPeriodEnds);
        tx = await lupiManagerInstance.__callback( queryId , START_REVEALING,
                    {from: lupiManagerOwner, gas: lupiHelper.GAS.startRevealingCallBack.gas} );
        testHelper.logGasUse(testCaseName,"lupiManager.__callback()", "START_REVEALING", tx);
        assert.equal(tx.logs[0].args.queryId, queryId, "queryId should be set in the event emitted from __calback");
        assert.equal(tx.logs[0].args.resultRcv, START_REVEALING, "resultRcv should be START_REVEALING in the event emitted from __calback");
        assert.equal(tx.logs[0].args.msg, SUCCESS_CB, "msg should be SUCCESS_CB in the event emitted from __calback");
        //console.log(JSON.stringify( tx.logs, null, 4));
        var roundInfo = new lupiHelper.RoundInfo(await gameInstance.getRoundInfo());
        assert.equal(roundInfo.state, "1", "Round state should be Revealing when callback is expected");
    }); // should be possible to schedule startRevealing when bettingPeriodEnds is set

    it("shouldn't be possible to schedule startRevealing when bettingPeriodEnds is 0");
    it("shouldn't be possible to schedule startRevealing when game is not in Betting state");
    it("startRevealing callback should emmit error in log event when the game is not in Betting state anymore");
    it("startRevealing callback should emmit error when queryId is invalid");
    it("shouldn't be possible to schedule startRevealing with invalid gameAddress");
    // TODO: scheduling the same gameAddress again?

    it("should be possible to schedule declareWinner");
    it("should be possible to schedule revealBet");
    it("should be possible to schedule payWinner");
    it("should be possible to schedule refund");

}); // contract("LupiManager schedule tests)
