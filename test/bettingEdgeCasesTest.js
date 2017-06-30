var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/testHelper.js');
var bettingHelper = new require('./helpers/bettingHelper.js');

contract("Lupi betting edge case tests", accounts => {

    it('should be possible to declareWinner without any bets revealed', done => {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: no reveal", ticketCountLimit: 3,
            bettingPeriodLength: 0, revealPeriodLength: 0, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2,4,5], expWinningIdx: 0, expWinningNumber: 0, toRevealCt: 0 });
        bettingHelper.runBettingTest( testParams )
        .then( res => { done(); });
    }); // should be possible to declareWinner without anybets revealed

    it("shouldn't be possible to refund a bet twice", done =>  {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: refund twice", ticketCountLimit: 3,
            bettingPeriodLength: 0, revealPeriodLength: 0, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2,4,5], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 3 });
        bettingHelper.runBettingTest( testParams )
        .then( res => {
            return helper.expectThrow( res.refund(1));
        }).then( res => {
            done();
         });
    }); // shouldn't be possible to refund a bet twice

    it("shouldn't be possible to pay a winner twice", done => {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: paywinner twice", ticketCountLimit: 3,
            bettingPeriodLength: 0, revealPeriodLength: 0, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [4,3,5], expWinningIdx: 2, expWinningNumber: 3, toRevealCt: 3 });
        bettingHelper.runBettingTest( testParams)
        .then( res => {
            return helper.expectThrow( res.payWinner());
        }).then( res => {
            done();
         });
    }); // shouldn't be possible to pay a winner twice

    it("shouldn't be able to refund with invalid ticketId request", done =>  {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: refund invalid ticket", ticketCountLimit: 3,
            bettingPeriodLength: 0, revealPeriodLength: 0, requiredBetAmount: web3.toWei(1),
            feePt: 10000, betsToPlace: [2,4,5], expWinningIdx: 1, expWinningNumber: 2, toRevealCt: 3 });
        bettingHelper.runBettingTest( testParams)
        .then( res => {
            return helper.expectThrow( res.refund(4));
        }).then( res => {
            done();
         });
    }); // shouldn't be able to refund with invalid ticketId request

    it("shouldn't be able to payWinner when there is no winner", done =>  {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: payWinner nowinner",
            ticketCountLimit: 4, betsToPlace: [2,4,4,2], toRevealCt: 4,
            expWinningIdx: 0, expWinningNumber: 0,
            bettingPeriodLength: 0, revealPeriodLength: 0, feePt: 10000, requiredBetAmount: web3.toWei(1)});
        bettingHelper.runBettingTest( testParams)
        .then( res => {
            return helper.expectThrow( res.payWinner());
        }).then( res => {
            done();
         });
    }); // shouldn't be able to payWinner when there is no winner

    it("shouldn't be able to refund when there is a winner", done =>  {
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "edge: refund winner",
            ticketCountLimit: 4, betsToPlace: [2,4,2,5], toRevealCt: 4,
            expWinningIdx: 2, expWinningNumber: 4,
            bettingPeriodLength: 0, revealPeriodLength: 0, feePt: 10000, requiredBetAmount: web3.toWei(1)});
        bettingHelper.runBettingTest( testParams)
        .then( res => {
            return helper.expectThrow( res.payWinner());
        }).then( res => {
            done();
         });
    }); // shouldn't be able to refund when there is a winner

    it("shouldn't be able to placeBet with 0 number"); // assert VM exception
    it("shouldn't be able to placeBet with negative number"); // assert VM exception
    it("shouldn't be able to placeBet with invalid betAmount"); // assert VM exception
    it("should be able to placeBet and revealBet for someone else");

    it("shouldn't be possible to placeBet after ticketCountLimit reached" ); // (assert VM exception))
    it("shouldn't be possible to placeBet after bettingPeriodEnds" ); // (assert VM exception))

    // ticketCountLimit = 0 & bettingPeriodEnds is set
    it("should be possible to startRevealing after bettingPeriodEnds when there is no ticketCountLimit")
     /* TODO: need figure out how to test when bettingPeriodEnds , done =>  {
        bettingHelper.runBettingTest( { testCaseName: "edge: startRevealing no ticketCountLimit",
            ticketCountLimit: 0, betsToPlace: [2,4], toRevealCt: 0,
            expWinningIdx: 0, expWinningNumber: 0,
            bettingPeriodLength: 1, revealPeriodLength: 1, feePt: 10000,  requiredBetAmount: web3.toWei(1)})
        .then( res => { done(); });
    }); // should be possible to startRevealing after bettingPeriodEnds when there is no ticketCountLimit
    */
    it("should be possible to reveal (w/o startRevealing) after bettingPeriodEnds when there is no tickCountLimit");

    // both tickCountLimit & bettingPeriodEnds is set
    it("should be possible to startRevealing after bettingPeriodEnds when the ticketCountLimit is not reached yet");
    it("shouldn't be possible to startRevealing before ticketCountLimit reached and it's not bettingPeriodEnds yet"); // assert VM exception
    it("shouldn't be possible to startRevealing before bettingPeriodEnds and ticketCountLimit is not reached yet"); // assert VM exception

    // ticketCountLimit is set & bettingPeriodEnds = 0
        // it's covered with most bettingTest.js testcases
        // it("should be possible to startRevealing when ticketCountLimit reached"); // it's covered with most bettingTest.js testcases
        // it("should be possible to reveal (w/o startRevealing) after ticketCountLimit reached"); // it's covered with most bettingTest.js testcases

    it("should be possible to declareWinner before revealPeriodEnds when all tickets revealed");
    it("should be possible to declareWinner after revealPeriodEnds when NOT all tickets revealed");
    it("shouldn't be possible to declareWinner before revaelPeriodEnds when not all tickets revealed"); // assert VM exception)

    it("shouldn't be possible to refund when round is not closed"); // assert VM exception
    it("shouldn't be possible to payWinner when round not closed"); // assert VM exception

});
