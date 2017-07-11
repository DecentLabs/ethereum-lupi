var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/testHelper.js');
var lupiHelper = new require('../app/javascripts/LupiHelper.js');
var gas = new require('../app/javascripts/Gas.js');
var bettingHelper = new require('./helpers/bettingHelper.js');
var moment = require('moment');

contract("Lupi betting edge case tests", accounts => {
    //*************************************************************
    // placeBet
    // ************************************************************

    it("shouldn't be able to placeBet with invalid betAmount", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: placeBet 1",
            ticketCountLimit: 3, bettingPeriodLength: 600, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 0 });
        await bettingHelper._createGame(testParams);
        await bettingHelper._placeBets(testParams);
        testParams.betsToPlace[0].amount = web3.toWei(0.5);
        await helper.expectThrow( bettingHelper._placeBets(testParams));
    }); // shouldn't be able to placeBet with invalid betAmount

    it("shouldn't be possible to placeBet after ticketCountLimit reached", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: placeBet 2",
            ticketCountLimit: 1, bettingPeriodLength: 600, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 0 });
        await bettingHelper._createGame(testParams);
        await bettingHelper._placeBets(testParams);
        await helper.expectThrow( bettingHelper._placeBets(testParams));
    });

    it("shouldn't be possible to placeBet after bettingPeriodEnds", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: placeBet 3",
            ticketCountLimit: 3, bettingPeriodLength: 1, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 0 });
        await bettingHelper._createGame(testParams);
        var bettingPeriodEnds = ( await testParams.gameInstance.bettingPeriodEnds() ).toNumber();
        await helper.waitForTimeStamp(bettingPeriodEnds);
        await helper.expectThrow( bettingHelper._placeBets(testParams));
    }); // shouldn't be possible to placeBet after bettingPeriodEnds

    //*************************************************************
    // ticketCountLimit = 0 & bettingPeriodEnds is set
    // ************************************************************
    it("should be possible to startRevealing after bettingPeriodEnds when there is no ticketCountLimit", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: startReveal 1",
            ticketCountLimit: 0, bettingPeriodLength: 2, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 1 });
        await bettingHelper._createGame(testParams);
        var bettingPeriodEnds = ( await testParams.gameInstance.bettingPeriodEnds() ).toNumber();
        await helper.waitForTimeStamp(bettingPeriodEnds);
        await bettingHelper._startRevealing(testParams);
    }); // should be possible to startRevealing after bettingPeriodEnds when there is no ticketCountLimit

    // This is covered multiple times in bettingTest.js: it("should be possible to reveal (w/o startRevealing) after bettingPeriodEnds when there is no tickCountLimit");

    //*************************************************************
    // both tickCountLimit & bettingPeriodEnds is set
    //*************************************************************
    it("should be possible to startRevealing after bettingPeriodEnds when the ticketCountLimit is not reached yet", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: startReveal 2",
            ticketCountLimit: 3, bettingPeriodLength: 1, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2,4], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 2 });
        await bettingHelper._createGame(testParams);
        var bettingPeriodEnds = ( await testParams.gameInstance.bettingPeriodEnds() ).toNumber();
        await helper.waitForTimeStamp(bettingPeriodEnds);
        await bettingHelper._startRevealing(testParams);
    }); // should be possible to startRevealing after bettingPeriodEnds when the ticketCountLimit is not reached yet

    it("revealPeriod should start when ticketCountLimit reached even if no bettingPeriodEnds yet", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: startReveal 3",
            ticketCountLimit: 2, bettingPeriodLength: 600, revealPeriodLength: 1,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2,4], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 1 });
        await bettingHelper._createGame(testParams)
        await bettingHelper._placeBets(testParams);
        var revealPeriodEnds = ( await testParams.gameInstance.revealPeriodEnds() ).toNumber();
        await helper.waitForTimeStamp(revealPeriodEnds);
        await bettingHelper._revealBets(testParams);
    }); // should be possible to startRevealing after bettingPeriodEnds when the ticketCountLimit is not reached yet

    it("shouldn't be possible to startRevealing before ticketCountLimit reached and it's not bettingPeriodEnds yet", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: startReveal 4",
            ticketCountLimit: 3, bettingPeriodLength: 600, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2,4], expWinningIdx: 0, expWinningNumber: 0, toRevealCt: 0 });
        await bettingHelper._createGame(testParams)
        await bettingHelper._placeBets(testParams);
        await helper.expectThrow( bettingHelper._startRevealing(testParams));
    }); // shouldn't be possible to startRevealing before ticketCountLimit reached and it's not bettingPeriodEnds yet

    //*************************************************************
    // ticketCountLimit is set & bettingPeriodEnds = 0
    //*************************************************************
        // it's covered with most bettingTest.js testcases
        // it("should be possible to startRevealing when ticketCountLimit reached"); // it's covered with most bettingTest.js testcases
        // it("should be possible to reveal (w/o startRevealing) after ticketCountLimit reached"); // it's covered with most bettingTest.js testcases

    //*************************************************************
    // reveal
    //*************************************************************
    it("shouldn't be able to reveal a bet wih 0 number", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: reveal 1",
            ticketCountLimit: 1, bettingPeriodLength: 0, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1), feePt: 10000,
            betsToPlace: [ { number: 0, idx: 1, playerAddress: "0x94011c67bc1e6448ed4b8682047358ca6cd09470",
                encryptedBet: "0xab2853f512def13595005642408a0aeb7ac8bb76e95d4cb325d73e1faa8f58de"}],
            expWinningIdx: 0, expWinningNumber: 0, toRevealCt: 1 });
        await bettingHelper._createGame(testParams)

        var gasEstimate = gas.lupi.placeBetLast.gas;
        var bet = testParams.betsToPlace[0];
        var tx = await testParams.gameInstance.placeBet(bet.encryptedBet,
                    { from: bet.playerAddress, value: testParams.requiredBetAmount, gas: gasEstimate });
        if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") }
        bet.ticketId = tx.logs[0].args.ticketId.toNumber();
        helper.logGasUse(testParams.testCaseName, "placeBet()", "ticketId: " + bet.ticketId + " | idx: " + bet.idx + " | number: " + bet.number ,  tx);
        await helper.expectThrow( bettingHelper._revealBets(testParams));
    }); // shouldn't be able to reveal a bet wih 0 number

    it("shouldn't be able to reveal a bet wih invalid salt",  async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: reveal 2",
            ticketCountLimit: 1, bettingPeriodLength: 0, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [1], expWinningIdx: 0, expWinningNumber: 0, toRevealCt: 1 });
        await bettingHelper._createGame(testParams)
        await bettingHelper._placeBets(testParams); // we pass 1 first to let sealBet pass
        testParams.salt = "0x000000d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c";
        await helper.expectThrow( bettingHelper._revealBets(testParams));
    });

    it("should be able to revealBet for someone else", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: revealbet 3",
            ticketCountLimit: 1, bettingPeriodLength: 0, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 1 });
        await bettingHelper._createGame(testParams)
        await bettingHelper._placeBets(testParams);
        var revealTx = await testParams.gameInstance.revealBetForAddress(testParams.betsToPlace[0].playerAddress,
                testParams.betsToPlace[0].ticketId, testParams.betsToPlace[0].number, testParams.salt,
                {from: accounts[13]});
        helper.logGasUse(testParams.testCaseName, "revealBet()", "ticketId: " + testParams.betsToPlace[0].ticketId + " | idx: "
                + testParams.betsToPlace[0].idx + " | number: " + testParams.betsToPlace[0].number, revealTx);

        assert.equal(revealTx.logs[0].event, "e_BetRevealed", "e_BetRevealed event should be emmitted");
        assert.equal(revealTx.logs[0].args.player, testParams.betsToPlace[0].playerAddress, "playerAddress should be set in e_BetRevealed event");
        assert.equal(revealTx.logs[0].args.ticketId, testParams.betsToPlace[0].ticketId, "ticketId should be set in e_BetRevealed event");
        assert.equal(revealTx.logs[0].args.bet, testParams.betsToPlace[0].number, "bet should be set in e_BetRevealed event");

    }); // should be able to revealBet for someone else

    // We can validate this easily only on client side but it shouldn't cause any issue (ie. negative underflows, resuls in a bigger positive guessed number)
    // it("shouldn't be able to reveal a bet negative number"); // can we do

    //*************************************************************
    // declareWinner
    //*************************************************************
    it('should be possible to declareWinner without any bets revealed', async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: declareWinner 1",
            ticketCountLimit: 2, bettingPeriodLength: 0, revealPeriodLength: 0, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2,4], expWinningIdx: 0, expWinningNumber: 0, toRevealCt: 0 });
        await bettingHelper.runBettingTest( testParams );
    }); // should be possible to declareWinner without anybets revealed

    it("should be possible to declareWinner before revealPeriodEnds when all tickets revealed", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: declareWinner 2",
            ticketCountLimit: 2, bettingPeriodLength: 6000, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [4,3], expWinningIdx: 2, expWinningNumber: 3, toRevealCt: 2 });
        await bettingHelper._createGame(testParams)
        await bettingHelper._placeBets(testParams);
        await bettingHelper._revealBets(testParams);
        await bettingHelper._declareWinner(testParams);
    }); // should be possible to declareWinner before revealPeriodEnds when all tickets revealed

    it("should be possible to declareWinner after revealPeriodEnds when NOT all tickets revealed", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: declareWinner 3",
            ticketCountLimit: 2, bettingPeriodLength: 6000, revealPeriodLength: 2,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [4,3], expWinningIdx: 1, expWinningNumber: 4, toRevealCt: 1 });
        await bettingHelper._createGame(testParams)
        await bettingHelper._placeBets(testParams);
        await bettingHelper._revealBets(testParams);
        var revealPeriodEnds = ( await testParams.gameInstance.revealPeriodEnds() ).toNumber();
        await helper.waitForTimeStamp(revealPeriodEnds);
        await bettingHelper._declareWinner(testParams);
    }); // should be possible to declareWinner after revealPeriodEnds when NOT all tickets revealed

    it("shouldn't be possible to declareWinner before revaelPeriodEnds when not all tickets revealed", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: declareWinner 4",
            ticketCountLimit: 2, bettingPeriodLength: 6000, revealPeriodLength: 600,
            requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [4,3], expWinningIdx: 2, expWinningNumber: 3, toRevealCt: 1 });
        await bettingHelper._createGame(testParams)
        await bettingHelper._placeBets(testParams);
        await bettingHelper._revealBets(testParams);
        await helper.expectThrow( bettingHelper._declareWinner(testParams));
    }); // shouldn't be possible to declareWinner before revaelPeriodEnds when not all tickets revealed

    //*************************************************************
    // Refund/payWinner
    //*************************************************************
    it("shouldn't be possible to refund a bet twice", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: refund twice",
            ticketCountLimit: 1, bettingPeriodLength: 0, revealPeriodLength: 600, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 1 });
        var gameInstance = await bettingHelper.runBettingTest( testParams )
        await helper.expectThrow( gameInstance.refund(1));
    }); // shouldn't be possible to refund a bet twice

    it("shouldn't be possible to pay a winner twice", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: paywinner twice",
            ticketCountLimit: 1, bettingPeriodLength: 0, revealPeriodLength: 600, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [4], expWinningIdx: 1, expWinningNumber: 4, toRevealCt: 1 });
        var gameInstance = await bettingHelper.runBettingTest( testParams)
        await helper.expectThrow( gameInstance.payWinner());
    }); // shouldn't be possible to pay a winner twice

    it("shouldn't be able to refund with invalid ticketId request", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: refund invalid ticket",
        ticketCountLimit: 1, bettingPeriodLength: 0, revealPeriodLength: 600, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 1 });
        var gameInstance = await bettingHelper.runBettingTest( testParams)
        await helper.expectThrow( gameInstance.refund(1));
    }); // shouldn't be able to refund with invalid ticketId request

    it("shouldn't be able to payWinner when there is no winner", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: payWinner nowinner",
            ticketCountLimit: 2, betsToPlace: [2,2], toRevealCt: 2,
            expWinningIdx: 0, expWinningNumber: 0,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000, requiredBetAmount: web3.toWei(1)});
        var gameInstance = await bettingHelper.runBettingTest( testParams);
        await helper.expectThrow( gameInstance.payWinner());
    }); // shouldn't be able to payWinner when there is no winner

    it("shouldn't be able to refund when there is a winner", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: refund winner",
            ticketCountLimit: 2, betsToPlace: [2,4], toRevealCt: 2,
            expWinningIdx: 1, expWinningNumber: 2,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000, requiredBetAmount: web3.toWei(1)});
        var gameInstance = await bettingHelper.runBettingTest( testParams)
        await helper.expectThrow( gameInstance.payWinner());
    }); // shouldn't be able to refund when there is a winner

    it("shouldn't be possible to payWinner or refund when round not closed", async function () {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: refundpay roundopen",
            ticketCountLimit: 1,
            betsToPlace: [ {number: 2, ticketId: 1, idx: 0, playerAddress: accounts[1] } ], // manually filling up for calling _payWinnerOrRefund without _placeBet first
            toRevealCt: 1,
            expWinningIdx: 0, expWinningNumber: 0,
            bettingPeriodLength: 0, revealPeriodLength: 1, feePt: 10000, requiredBetAmount: web3.toWei(1)});
        await bettingHelper._createGame(testParams);

        //****** while betting *****
        testParams.expWinningNumber = 0; // for refund
        await helper.expectThrow( bettingHelper._payWinnerOrRefund(testParams));
        testParams.expWinningNumber = 2; // for payWinner
        testParams.expWinningIdx = 1;
        await helper.expectThrow( bettingHelper._payWinnerOrRefund(testParams));

        //****** while revealing  *****
        testParams.betsToPlace = [2];
        await bettingHelper._placeBets(testParams);
        await bettingHelper._revealBets(testParams);
        testParams.expWinningNumber = 0; // for refund
        await helper.expectThrow( bettingHelper._payWinnerOrRefund(testParams));
        testParams.expWinningNumber = 2; // for payWinner
        await helper.expectThrow( bettingHelper._payWinnerOrRefund(testParams));
    }); // shouldn't be possible to payWinner when round not closed

});
