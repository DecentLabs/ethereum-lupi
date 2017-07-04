var bettingHelper = new require('../helpers/bettingHelper.js');

contract("Lupi 100 bets Tied", accounts => {

    it('should be possible to play a round with 100 bet with no winner', done => {

        var bets = [ 9, 8, 14, 9, 15, 21, 68, 78, 8, 77,
                    84, 35, 96, 53, 7, 85, 77, 57, 84, 67,
                    4, 14, 70, 57, 58, 38, 29, 60, 37, 93,
                    16, 37, 93, 72, 98, 83, 74, 72, 97, 70,
                    81, 45, 74, 9, 76, 17, 85, 99, 63, 96,
                    60, 78, 40, 21, 41, 69, 35, 83, 78, 7,
                    40, 41, 26, 19, 69, 39, 16, 68, 39, 82,
                    17, 3, 82, 16, 17, 12, 27, 27, 11, 19,
                    11, 64, 12, 67, 29, 98, 38, 45, 63, 26,
                    64, 76, 58, 3, 4, 97, 53, 99, 81, 15];

        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "100b tie",
            ticketCountLimit: bets.length, betsToPlace: bets, toRevealCt: bets.length,
            expWinningIdx: 0, expWinningNumber: 0,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000,  requiredBetAmount: web3.toWei(1)});
        bettingHelper.runBettingTest( testParams)
        .then( res => { done(); });
    }).timeout(120*60*1000 );; // should be possible to play a round with 100 bet with no winner


}); // contract("Lupi betting tests)
