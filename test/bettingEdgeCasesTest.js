var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/testHelper.js');
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
        bettingHelper.runBettingTest("edge: refund twice", web3.toWei(1), 0, 10000, [2,4,5], 1, 2)
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
        bettingHelper.runBettingTest("edge: refund invalid ticket", web3.toWei(1), 0, 10000, [2,4,5], 1, 2)
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

    it("shouldn't be able to placeBet with 0 number"); // assert VM exception
    it("shouldn't be able to placeBet with negative number"); // assert VM exception
    it("shouldn't be able to placeBet with invalid betAmount"); // assert VM exception
    it("should be able to placeBet and revealBet for someone else");

    it("shouldn't be possible to placeBet after ticketCountLimit reached" ); // (assert VM exception))
    it("shouldn't be possible to placeBet after bettingPeriodEnds" ); // (assert VM exception))

    it("shouldn't be possible to startRevealing before bettingPeriodEnds"); // assert VM exception
    it("should be possible to startRevealing after bettingPeriodEnds");
    it("should be possible to reveal (w/o startRevealing) after bettingPeriodEnds");

    it("shouldn't be possible to startRevealing before ticketCountLimit reached"); // assert VM exception
    it("should be possible to startRevealing after ticketCountLimit reached");
    it("should be possible to reveal (w/o startRevealing) after ticketCountLimit reached");

    it("shouldn't be possible to declareWinner before all tickets revealed"); // assert VM exception)
    it("should be possible to declareWinner when all tickets revealed");
    it("should be possible to declareWinner after revealPeriodEnds and not all tickets revealed");

    it("shouldn't be possible to refund when round is not closed"); // assert VM exception
    it("shouldn't be possible to payWinner when round not closed"); // assert VM exception

});
