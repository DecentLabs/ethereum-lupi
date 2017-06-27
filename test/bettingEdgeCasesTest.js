var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/helper.js');
var bettingHelper = new require('./helpers/bettingHelper.js');

contract("Lupi betting edge case tests", accounts => {

    before( function () {
        bettingHelper.setAccounts(accounts);
    });

    it('should be possible to declareWinner without any bets revealed', done => {
        // runBettingTest(roundName, requiredBetAmount, revealPeriodLength, feePt,
        //         betsToPlace, expWinningIdx, expWinningNumber [, toRevealCt || default: all ])
        bettingHelper.runBettingTest("edge: no reveal", web3.toWei(1), 0, 10000, [2,4,5], 0, 0, 0)
        .then( res => { done(); });
    }); // should be possible to declareWinner without anybets revealed

    it("shouldn't be possible to refund a bet twice", done =>  {
        bettingHelper.runBettingTest("edge: refund twice", web3.toWei(1), 0, 10000, [2,4,5], 0, 0, 0)
        .then( res => {
            return helper.expectThrow( res.refund(1));
        }).then( res => {
            done();
         });
    }); // shouldn't be possible to refund a bet twice

    it("shouldn't be possible to pay a winner twice", done => {
        bettingHelper.runBettingTest("edge: paywinner twice", web3.toWei(1), 0, 10000, [4,3,5], 2, 3)
        .then( res => {
            return helper.expectThrow( res.payWinner());
        }).then( res => {
            done();
         });
    }); // shouldn't be possible to pay a winner twice

    it("shouldn't be able to refund with invalid ticketId request", done =>  {
        bettingHelper.runBettingTest("edge: refund twice", web3.toWei(1), 0, 10000, [2,4,5], 0, 0, 0)
        .then( res => {
            return helper.expectThrow( res.refund(4));
        }).then( res => {
            done();
         });
    }); // shouldn't be able to refund with invalid ticketId request

    it("shouldn't be able to payWinner when there is no winner", done =>  {
        bettingHelper.runBettingTest("edge: payWinner nowinner", web3.toWei(1), 0, 10000, [2,4,4,2], 0, 0)
        .then( res => {
            return helper.expectThrow( res.payWinner());
        }).then( res => {
            done();
         });
    }); // shouldn't be able to payWinner when there is no winner

    it("shouldn't be able to refund when there is a winner", done =>  {
        bettingHelper.runBettingTest("edge: refund winner", web3.toWei(1), 0, 10000, [2,4,2,5], 2, 4)
        .then( res => {
            return helper.expectThrow( res.payWinner());
        }).then( res => {
            done();
         });
    }); // shouldn't be able to refund when there is a winner

    it("should be possible to call startRevealing when ticketCountLimit reached"); // all other tests relying on first reveal calling startRevealing
    it("shouldn't be able to placeBet with 0 number"); // assert VM exception
    it("shouldn't be able to placeBet with negative number");
    it("shouldn't be able to placeBet with invalid betAmount"); // assert VM exception
    it("shouldn't be able to placeBet after ticketCountLimit reached" ); // (assert VM exception))
    it("should be able to placeBet and revealBet for someone else");
    it("shouldn't be able to startRevealing before ticketCountLimit reached"); // assert VM exception
    it("shouldn't be able to declareWinner before ticketCountLimit reached "); // assert VM exception)
    it("shouldn't be abel to refund when round is not closed yet"); // assert VM exception
    it("shouldn't be able to payWinner when round not closed"); // assert VM exception

});
