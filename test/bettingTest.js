var bettingHelper = new require('./helpers/bettingHelper.js');

contract("Lupi betting tests", accounts => {

    before( function () {
        bettingHelper.setAccounts(accounts);
    });

    it('should be possible to play a round with 1 bet', done => {
        bettingHelper.runBettingTest( { testCaseName: "1b win",
            ticketCountLimit: 1, betsToPlace: [2], toRevealCt: 1,
            expWinningIdx: 1, expWinningNumber: 2,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000,  requiredBetAmount: web3.toWei(1)})
        .then( res => { done(); });
    }); // should be possible to play a round with 1 bet

    it('should be possible to play a round with 4 bets and winner', done => {
        bettingHelper.runBettingTest( { testCaseName: "4b win",
            ticketCountLimit: 4, betsToPlace: [2,8,5,2], toRevealCt: 4,
            expWinningIdx: 3, expWinningNumber: 5,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000,  requiredBetAmount: web3.toWei(1)})
        .then( res => { done(); });
    }); // should be possible to play a round with 4 bets and winner

    it('should be possible to play a round with 4 bets and no winner', done => {
        bettingHelper.runBettingTest( { testCaseName: "4b no win",
            ticketCountLimit: 4, betsToPlace: [2,5,2,5], toRevealCt: 4,
            expWinningIdx: 0, expWinningNumber: 0,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000,  requiredBetAmount: web3.toWei(1)})
        .then( res => { done(); });
    }); // should be possible to play a round with 4 bets and no winner

    it('should be possible to play a round with 10 bets and winner', done => {
        bettingHelper.runBettingTest( { testCaseName: "10b win",
            ticketCountLimit: 10, betsToPlace: [99,12,3,76,12,3,12,3,9,12], toRevealCt: 10,
            expWinningIdx: 9, expWinningNumber: 9,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000,  requiredBetAmount: web3.toWei(1)})
        .then( res => { done(); });
    }); // should be possible to play a round with 10 bets and winner

    it('should be possible to play a round with 10 bets and no winner', done => {
        bettingHelper.runBettingTest( { testCaseName: "10b win",
            ticketCountLimit: 10, betsToPlace: [2,3,6,5,9,3,9,5,6,2], toRevealCt: 10,
            expWinningIdx: 0, expWinningNumber: 0,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000,  requiredBetAmount: web3.toWei(1)})
        .then( res => { done(); });
    }); // should be possible to play a round with 10 bets and no winner

}); // contract("Lupi betting tests)
