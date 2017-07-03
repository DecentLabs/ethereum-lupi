var bettingHelper = new require('../helpers/bettingHelper.js');

contract("Lupi 100 bets winner", accounts => {

    it('should be possible to play a round with 100 bet with winner', done => {
        
        var bets = [43, 87, 24, 23, 11, 56, 64, 78, 86, 71,
                    72, 95, 94, 91, 43, 59, 82, 72, 43, 25,
                    62, 23, 11, 72, 37, 47, 61, 97, 23, 70,
                    81, 21, 25, 12, 92, 18, 59, 77, 96, 16,
                    44, 61, 4, 85, 72, 61, 61, 71, 31, 57,
                    76, 65, 62, 75, 17, 69, 20, 16, 18, 61,
                    86, 28, 21, 72, 41, 15, 77, 79, 68, 67,
                    41, 32, 11, 82, 50, 69, 43, 47, 68, 33,
                    40, 58, 39, 39, 58, 26, 28, 50, 59, 13,
                    6, 5, 75, 57, 27, 27, 67, 90, 18, 31];
        var testParams = new bettingHelper.TestParams( { accounts: accounts, testCaseName: "100b win",
            ticketCountLimit: bets.length, betsToPlace: bets, toRevealCt: bets.length,
            expWinningIdx: 43, expWinningNumber: 4,
            bettingPeriodLength: 0, revealPeriodLength: 600, feePt: 10000,  requiredBetAmount: web3.toWei(1)});
        bettingHelper.runBettingTest( testParams)
        .then( res => { done(); });
    }).timeout(120*60*1000 ); // should be possible to play a round with 1 bet


}); // contract("Lupi betting tests)
