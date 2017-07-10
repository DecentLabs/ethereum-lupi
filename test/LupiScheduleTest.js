require('babel-polyfill');
var lupi = artifacts.require("./Lupi.sol");
var lupiManager = artifacts.require("./LupiManager.sol");
var lupiScheduler = artifacts.require("./LupiScheduler.sol");
var lupiHelper = new require('../app/javascripts/LupiHelper.js');
var lupiSchedulerTestHelper = new require('./helpers/LupiSchedulerTestHelper');
var bettingHelper = new require('./helpers/bettingHelper.js');
var gas = new require('../app/javascripts/Gas.js');
var testHelper = new require('./helpers/testHelper.js');
var moment = require('moment');

const ORACLIZE_CB_TRESHHOLD = 1; // extra secs to wait in the test which wait for Oraclize  callback
var lupiSchedulerInstance, lupiManagerInstance, lupiSchedulerOwner;
var CB_EXTRA_SECS, START_REVEALING, SUCCESS_CB; // constants coming from LupiManager contract

contract("LupiManager schedule tests", accounts => {

    // this is a prerequisite by the other tests
    // some of it should go to the  before but can't set timeout there
    it("should be possible to create lupiScheduler and read its constants", done => {
        new Promise( async function (resolve, reject) {
            lupiManagerInstance = await lupiManager.new();
            lupiSchedulerInstance = await lupiSchedulerTestHelper.newLupiScheduler();
            var x = await lupiSchedulerInstance.CB_EXTRA_SECS();
            CB_EXTRA_SECS = parseInt( x.valueOf() );
            START_REVEALING = await lupiSchedulerInstance.START_REVEALING();
            DECLARE_WINNER = await lupiSchedulerInstance.DECLARE_WINNER();
            SUCCESS_CB = await lupiSchedulerInstance.SUCCESS_CB();
            lupiSchedulerOwner = await lupiSchedulerInstance.owner();
            resolve();
        }).then( res => {
         done()
        });
    }).timeout(5*60*1000 );

    // this is a prerequisite by the other tests
    it("should be possible to send money to lupiScheduler", done => {
        new Promise( async function (resolve, reject) {
            var balanceBefore = web3.eth.getBalance(lupiSchedulerInstance.address);
            var toSend = web3.toWei( 5);
            res = await lupiSchedulerInstance.sendTransaction( {from: accounts[0], value: toSend })
            var balanceAfter = web3.fromWei( web3.eth.getBalance(lupiSchedulerInstance.address)).toString();
            assert.equal(balanceAfter, web3.fromWei(balanceBefore + toSend).toString(), "contract balance should be set after sending money");
            resolve();
        }).then( res => {
         done()
        });
    }).timeout(120*60*1000 );

    it("should be possible to schedule startRevealing when bettingPeriodEnds is set", async function() {
        var testCaseName = "LupiManager Scheduling 1";
        if (web3.version.network == 1976) {
            assert(false, "This test is not working on privatechain")
        }
        var bettingPeriodLength = 2;
        var balanceBefore = web3.eth.getBalance(lupiSchedulerInstance.address)
        var gasEstimate = gas.lupiManager.createGame.gas;
        var tx = await lupiManagerInstance.createGame( web3.toWei(1), 3, bettingPeriodLength, 1, 20000, {gas: gasEstimate});
        if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
        testHelper.logGasUse(testCaseName, "lupiManager.createGame()", "", tx);

        var gameInstance = lupi.at(tx.logs[2].args.gameAddress);
        var gasEstimate = gas.lupiScheduler.scheduleStartRevealing.gas;
        tx = await lupiSchedulerInstance.scheduleStartRevealing( gameInstance.address,
                { gas: gasEstimate});
        if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
        testHelper.logGasUse(testCaseName,"lupiScheduler.scheduleStartRevealing()", "", tx);
        var revealQueryId = tx.logs[0].args.queryId;
        assert.equal( revealQueryId.length, 66, "scheduleStartRevealing should return a queryID");
        assert.equal( tx.logs[0].event, "e_startRevealingScheduled", "scheduleStartRevealing should emmit e_startRevealingScheduled event");
        // Paying only for gas to Oraclize, b/c  identity datasource is currently 0 fee
        var balanceExp = web3.fromWei( balanceBefore - (gas.lupiScheduler.startRevealingCallBack.gas
                            * gas.lupiScheduler.oraclizeGasPrice) );
        assert.equal( web3.fromWei( web3.eth.getBalance(lupiSchedulerInstance.address)).toString(), balanceExp.toString(), "Oraclize fee should be deducted from contract balance");

        /* START_REVEALING callback */
        var bettingPeriodEnds = await gameInstance.bettingPeriodEnds();
        var res = await testHelper.waitForTimeStamp(bettingPeriodEnds);
        tx = await lupiSchedulerInstance.__callback( revealQueryId , START_REVEALING,
                    {from: lupiSchedulerOwner, gas: gas.lupiScheduler.startRevealingCallBack.gas} );
        testHelper.logGasUse(testCaseName,"lupiScheduler.__callback()", "START_REVEALING", tx);
        var declareWinnerQueryId = tx.logs[0].args.queryId;
        assert.equal( declareWinnerQueryId.length, 66, "startRevealing __calback should emit a queryId for declareWinner callback");
        assert.equal( tx.logs[0].event, "e_declareWinnerScheduled", "scheduleStartRevealing should emmit e_startRevealingScheduled event");

        assert.equal(tx.logs[1].args.queryId, revealQueryId, "queryId should be set in the event emitted from __calback");
        assert.equal(tx.logs[1].args.resultRcv, START_REVEALING, "resultRcv should be START_REVEALING in the event emitted from __calback");
        assert.equal(tx.logs[1].args.msg, SUCCESS_CB, "msg should be SUCCESS_CB in the event emitted from __calback");
        var roundInfo = new lupiHelper.RoundInfo(await gameInstance.getRoundInfo());
        assert.equal(roundInfo.state, "1", "Round state should be Revealing when callback is expected");

        /* DECLARE_WINNER callback */
        var revealPeriodEnds = await gameInstance.revealPeriodEnds();
        var res = await testHelper.waitForTimeStamp(revealPeriodEnds);
        tx = await lupiSchedulerInstance.__callback( declareWinnerQueryId , DECLARE_WINNER,
                    {from: lupiSchedulerOwner, gas: gas.lupiScheduler.declareWinnerCallback.gas} );
        testHelper.logGasUse(testCaseName,"lupiScheduler.__callback()", "DECLARE_WINNER", tx);
        assert.equal(tx.logs[0].args.queryId, declareWinnerQueryId, "queryId should be set in the event emitted from __calback");
        assert.equal(tx.logs[0].args.resultRcv, DECLARE_WINNER, "resultRcv should be DECLARE_WINNER in the event emitted from __calback");
        assert.equal(tx.logs[0].args.msg, SUCCESS_CB, "msg should be SUCCESS_CB in the event emitted from __calback");

        var roundInfo = new lupiHelper.RoundInfo(await gameInstance.getRoundInfo());
        assert.equal(roundInfo.state, "3", "Round state should be Tied when callback is expected");
        assert.equal(roundInfo.winningTicket, 0, "The winningTicket should be set after declareWinner()");
        assert.equal(roundInfo.winningNumber, 0, "The winningNumber should be set after declareWinner()");
        assert.equal(roundInfo.winningAddress,0, "The winningAddress should be set after declareWinner()");

    }); // should be possible to schedule startRevealing when bettingPeriodEnds is set

    it('startRevealing and declareWinner should be scheduled with 3 bets and winner', async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "sch 4b win",
            ticketCountLimit: 4, betsToPlace: [2,8,5,2], toRevealCt: 3,
            expWinningIdx: 1, expWinningNumber: 2,
            bettingPeriodLength: 5, revealPeriodLength: 2, feePt: 10000,  requiredBetAmount: web3.toWei(1)});
            var testCaseName = "LupiManager Scheduling 2";
            if (web3.version.network == 1976) {
                assert(false, "This test is not working on privatechain")
            }
            /**** Create game & schedule startRevealing ***/
            await bettingHelper._createGame(testParams);

            var gasEstimate = gas.lupiScheduler.scheduleStartRevealing.gas;
            tx = await lupiSchedulerInstance.scheduleStartRevealing( testParams.gameAddress,
                    { gas: gasEstimate});
            if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
            testHelper.logGasUse(testCaseName,"lupiScheduler.scheduleStartRevealing()", "", tx);
            var revealQueryId = tx.logs[0].args.queryId;

            await bettingHelper._placeBets(testParams);

            /**** callback startRevealing ****/
            var bettingPeriodEnds = await testParams.gameInstance.bettingPeriodEnds();
            var res = await testHelper.waitForTimeStamp(bettingPeriodEnds);
            tx = await lupiSchedulerInstance.__callback( revealQueryId , START_REVEALING,
                        {from: lupiSchedulerOwner, gas: gas.lupiScheduler.startRevealingCallBack.gas} );
            testHelper.logGasUse(testCaseName,"lupiScheduler.__callback()", "START_REVEALING", tx);
            var declareWinnerQueryId = tx.logs[0].args.queryId;
            await bettingHelper._revealBets(testParams);

            /* DECLARE_WINNER callback */
            var revealPeriodEnds = await testParams.gameInstance.revealPeriodEnds();
            var res = await testHelper.waitForTimeStamp(revealPeriodEnds);
            tx = await lupiSchedulerInstance.__callback( declareWinnerQueryId , DECLARE_WINNER,
                        {from: lupiSchedulerOwner, gas: gas.lupiScheduler.declareWinnerCallback.gas} );
            testHelper.logGasUse(testCaseName,"lupiScheduler.__callback()", "DECLARE_WINNER", tx);
            var roundInfo = new lupiHelper.RoundInfo(await testParams.gameInstance.getRoundInfo());
            assert.equal(roundInfo.state, "2", "Round state should be Winner when callback is expected");
            console.log(testParams);
            assert.equal(roundInfo.winningTicket, testParams.expWinningTicketId, "The winningTicket should be set after declareWinner()");
            assert.equal(roundInfo.winningNumber, testParams.expWinningNumber, "The winningNumber should be set after declareWinner()");
            assert.equal(roundInfo.winningAddress, testParams.expWinningAddress, "The winningAddress should be set after declareWinner()");

    }); // should be possible to play a round with 4 bets and winner

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
