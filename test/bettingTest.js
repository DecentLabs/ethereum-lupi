var bettingHelper = new require('./helpers/bettingHelper.js');

contract("Lupi betting tests", accounts => {

    before( function () {
        bettingHelper.setAccounts(accounts);
    });

    it('should be possible to play a round with 1 bet', done => {
        // runBettingTest(roundName, requiredBetAmount, revealPeriodLength, feePt,
        //         betsToPlace, expWinningIdx, expWinningNumber [, toRevealCt || default: all ])
        bettingHelper.runBettingTest("1b win", web3.toWei(1), 600, 10000, [2], 1, 2)
        .then( res => { done(); });
    }); // should be possible to play a round with 1 bet

    it('should be possible to play a round with 4 bets and winner', done => {
        bettingHelper.runBettingTest("4b win", web3.toWei(1), 600, 20000, [2,8,5,2], 3, 5)
        .then( res => { done(); });
    }); // should be possible to play a round with 4 bets and winner

    it('should be possible to play a round with 4 bets and no winner', done => {
        bettingHelper.runBettingTest("4b no win", web3.toWei(1), 600, 20000, [2,5,2,5], 0, 0)
        .then( res => { done(); });
    }); // should be possible to play a round with 4 bets and no winner

    it('should be possible to play a round with 10 bets and winner', done => {
        bettingHelper.runBettingTest("10b win", web3.toWei(1), 600, 10000, [99,12,3,76,12,3,12,3,9,12], 9, 9)
        .then( res => { done(); });
    }); // should be possible to play a round with 10 bets and winner

    it('should be possible to play a round with 10 bets and no winner', done => {
        bettingHelper.runBettingTest("10b no win", web3.toWei(0.5), 600, 20000, [2,3,6,5,9,3,9,5,6,2], 0, 0)
        .then( res => { done(); });
    }); // should be possible to play a round with 10 bets and no winner

}); // contract("lupi")
