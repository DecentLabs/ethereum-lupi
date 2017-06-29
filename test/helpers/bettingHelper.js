// globals
global.assert = require('assert');
var lupi = artifacts.require("./Lupi.sol");
var lupiManager = artifacts.require("./LupiManager.sol");
var BigNumber = require('bignumber.js');
var testHelper = new require('./testHelper.js');
var lupiHelper = new require('../../app/javascripts/LupiHelper.js');
var moment = require('moment');

var salt = "0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c";
// needed to avoid polluting owner & player account with tx costs
var defaultTxAccount; // used for declareWinner, payerWinner and refund
var gameOwnerAddress, lupiManagerOwnerAddress; // used for creating the contract
var accounts;

module.exports = {
    setAccounts: setAccounts,
    runBettingTest: runBettingTest
}

function setAccounts(_accounts) {
    accounts = _accounts;
    defaultTxAccount = accounts[0]; // used for declareWinner, payerWinner and refund
    lupiManagerOwnerAddress = accounts[19];
    gameOwnerAddress = accounts[20]; // used for creating the contract
}

function runBettingTest(testParams) {
    // { testCaseName: "edge: no reveal", ticketCountLimit: 3, bettingPeriodLength: 0, revealPeriodLength: 600,
    //   feePt: 10000, betsToPlace: [2,4,5], expWinningIdx: 0, expWinningNumber: 0, toRevealCt: 0, requiredBetAmount: web3.toWei(1) }
            // for no winner round pass 0 for expWinningIdx & expWinningNumbert
            // omit toRevealCt arg if you want to reveal all bets
    var bettingPeriodEnd = testParams.bettingPeriodLength == 0 ? 0 :
                            testParams.bettingPeriodLength + moment().utc().unix();;
    if (typeof testParams.toRevealCt == "undefined") {
        testParams.toRevealCt = testParams.betsToPlace.length;
    }
    //testParams.requiredBetAmount = new BigNumber(testParams.requiredBetAmount);
    var playerAddress = (testParams.expWinningNumber == 0) ? accounts[1] : accounts[testParams.expWinningIdx];
    var expWinningAddress = (testParams.expWinningNumber == 0) ? 0 : accounts[testParams.expWinningIdx];
    var expWinningTicketId;
    var gameContractBalanceBefore, gameOwnerBalanceBefore, playerBalanceBefore;
    var revealStartTime;
    var lupiManagerInstance, gameInstance;

    var _placeBetFn = bet => {
        // called for each betsToPlace[] via  Promise.all(). Adds ticketId to bet struct
        return new Promise( function(resolve, reject) {
            gameInstance.sealBet(bet.number, salt, {from: bet.playerAddress})
            .then( sealRes => {
                bet.encryptedBet = sealRes;
                return gameInstance.placeBet(sealRes, {from: bet.playerAddress, value: bet.amount});
            }).then( tx => {
                bet.ticketId = tx.logs[0].args.ticketId.toNumber();
                testHelper.logGasUse(testParams.testCaseName, "placeBet()", "ticketId: " + bet.ticketId + " | idx: " + bet.idx + " | number: " + bet.number ,  tx);
                assert.equal(tx.logs[0].event, "e_BetPlaced", "e_BetPlaced event should be emmitted");
                assert.equal(tx.logs[0].args.player, bet.playerAddress, "playerAddress should be set in e_BetPlaced event");
                assert.equal(tx.logs[0].args.ticketId, bet.ticketId, "ticketId should be set in e_BetPlaced event");
                if( tx.logs.length == 2 ) { // ticketCountLimit reached, last bet
                    assert.equal(tx.logs[1].event, "e_RevealStarted", "e_RevealStarted event should be emmitted after last bet");
                    assert(tx.logs[1].args.revealPeriodEnds >  testParams.revealPeriodLength + revealStartTime - 10, "revealPeriod end should be at least as expected in e_RevealStarted ");
                    assert(tx.logs[1].args.revealPeriodEnds < testParams.revealPeriodLength + revealStartTime + 10, "revealPeriod end should be at most as expected in e_RevealStarted ");
                }

                resolve(tx);
            }).catch(error => {
                gameInstance.getRoundInfo()
                .then (res => {
                    var roundInfo = new lupiHelper.RoundInfo(res);
                    console.log("placeBet() error when placing bet.idx:", bet.idx, "RoundInfo: state:", roundInfo.state.toString(),
                            "ticketCountLimit:", roundInfo.ticketCountLimit, "bettingPeriodEnds:", roundInfo.bettingPeriodEnds,
                            "ticketCount:", roundInfo.ticketCount );
                    reject(error);
                })
            }); //
        }); // return new Promise
    }; _placeBetFn

    var _revealBetFn = bet => {
     // called for each betsToPlace[] via  Promise.all().
     return new Promise(resolve => resolve(
         gameInstance.revealBet(bet.ticketId, bet.number, salt, {from: bet.playerAddress})
         .then( revealTx => {
             var revealedEventIdx = 0;
             if( revealTx.logs.length == 2 ) { // this is the first reveal
                 assert.equal(revealTx.logs[0].event, "e_RevealStarted", "e_RevealStarted event should be emmitted after first reveal");
                 assert(revealTx.logs[0].args.revealPeriodEnds >  testParams.revealPeriodLength + revealStartTime - 10, "revealPeriod end should be at least as expected in e_RevealStarted ");
                 assert(revealTx.logs[0].args.revealPeriodEnds < testParams.revealPeriodLength + revealStartTime + 10, "revealPeriod end should be at most as expected in e_RevealStarted ");
                 revealedEventIdx = 1;
             }
             assert.equal(revealTx.logs[revealedEventIdx].event, "e_BetRevealed", "e_BetRevealed event should be emmitted");
             assert.equal(revealTx.logs[revealedEventIdx].args.player, bet.playerAddress, "playerAddress should be set in e_BetRevealed event");
             assert.equal(revealTx.logs[revealedEventIdx].args.ticketId, bet.ticketId, "ticketId should be set in e_BetRevealed event");
             assert.equal(revealTx.logs[revealedEventIdx].args.bet, bet.number, "bet should be set in e_BetRevealed event");

             testHelper.logGasUse(testParams.testCaseName, "revealBet()", "ticketId: " + bet.ticketId + " | idx: "
                 + bet.idx + " | number: " + bet.number, revealTx);
             return revealTx;
         })
     )); // return new Promise
    }; // _revealBetFn()

    var _refundFn = bet => {
     // called for each betsToPlace[] via  Promise.all().
     return new Promise(resolve => resolve(
         gameInstance.refund(bet.ticketId, {from: defaultTxAccount})
         .then( refundTx => {
             testHelper.logGasUse(testParams.testCaseName, "refund()", "ticketId: " + bet.ticketId + " | bet idx: "
                 + bet.idx + " | number: " + bet.number, refundTx);
             return refundTx;
         })
     )); // return new Promise
    }; // _refundFn()

    return lupiManager.new({from: lupiManagerOwnerAddress})
    .then( res => {
        lupiManagerInstance = res;
        return lupiManagerInstance.owner();
    }).then( res => {
        assert(lupiManagerOwnerAddress, res, "lupiManagerOwnerAddress should be set");
        return lupiManagerInstance.createGame(testParams.requiredBetAmount, testParams.ticketCountLimit, bettingPeriodEnd,
             testParams.revealPeriodLength, testParams.feePt, { from: lupiManagerOwnerAddress, gas: 1200000});
    }).then( tx => {
        testHelper.logGasUse(testParams.testCaseName, "lupiManager.createGame()",
                            "requiredBetAmount: " +  web3.fromWei(testParams.requiredBetAmount)
                            + " | ticketCountLimit: " + testParams.ticketCountLimit
                            + " | bettingPeriodLength: " + testParams.bettingPeriodLength
                            + " | revealPeriodLength: " + testParams.revealPeriodLength
                            , tx);
        assert.equal(tx.logs[1].event, "e_GameCreated", "e_GameCreated event should be emmitted");
        gameAddress = tx.logs[1].args.gameAddress;
        gameIdx = tx.logs[2].args.gameIdx;
        assert.equal(tx.logs[2].event, "e_GameAdded", "e_GameAdded event should be emmitted");
        assert.equal(tx.logs[2].args.gameIdx, 0, "gameIdx should be set in event");
        assert.equal(tx.logs[1].args.gameAddress, gameAddress, "new game address should be set in event");
        assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
        assert.equal(tx.logs[0].args.current, lupiManagerOwnerAddress, "new owner should be set in event");
        return lupiManagerInstance.games(gameIdx);
    }).then ( res => {
        assert.equal(res, gameAddress, "new game should be added");
        return lupiManagerInstance.getGamesCount();
    }).then ( res => {
        assert.equal(res, 1, "game count should be 1");
        gameInstance = lupi.at(gameAddress);
        return gameInstance.owner();
    }).then( res => {
        assert.equal(res, lupiManagerOwnerAddress, "new game owner should be the same as lupiManager's owner");
        return gameInstance.setOwner(gameOwnerAddress, {from: lupiManagerOwnerAddress});
    }).then( res => {
        assert.equal(res.logs[0].args.current, gameOwnerAddress, "new game owner should be set after setOwner");
        return gameInstance.getRoundInfo();
    }).then( res => {
        var roundInfo = new lupiHelper.RoundInfo(res);
        assert.equal(roundInfo.state, 0, "new game state should be betting");
        assert.equal(roundInfo.requiredBetAmount.toString(), testParams.requiredBetAmount.toString(), "new game requiredBetAmount should be set");
        assert.equal(roundInfo.ticketCountLimit, testParams.ticketCountLimit, "new game ticketCountLimit should be set");
        assert.equal(roundInfo.bettingPeriodEnds, bettingPeriodEnd, "new game bettingPeriodEnd should be set");
        assert.equal(roundInfo.revealPeriodLength, testParams.revealPeriodLength, "new game revealPeriodLength should be set");
        assert.equal(roundInfo.feePt, testParams.feePt, "new game feePt should be set");

        gameContractBalanceBefore = web3.eth.getBalance(gameInstance.address);
        playerBalanceBefore = web3.eth.getBalance(playerAddress);

        var expFeeAmount = testParams.requiredBetAmount * testParams.feePt / 1000000 * testParams.ticketCountLimit;
        var expWinnablePot = testParams.requiredBetAmount * testParams.ticketCountLimit - expFeeAmount;
        assert.equal(roundInfo.winnablePotAmount.toString(), expWinnablePot.toString(), "new round winnablePotAmount should be set");

        // betsToPlace transformed into a struct array  with playerAddress, encryptedBet  etc.
        for (var i = 0; i < testParams.betsToPlace.length ; i++){
            // playerAddress is ref to accounts[] (idx+1 to avoid pollutin owner ac with transaction fees)
            testParams.betsToPlace[i] = { number: testParams.betsToPlace[i], amount: testParams.requiredBetAmount, playerAddress: accounts[i+1], idx: i };
        }
        revealStartTime = moment().utc().unix();
        var placeBetActions = testParams.betsToPlace.map(_placeBetFn);
        var placeBetResults = Promise.all( placeBetActions );
        return placeBetResults;
    }).then( betsTxs => {
        return gameInstance.getRoundInfo();
    }).then( roundInfoRes => {
        var roundInfo = new lupiHelper.RoundInfo(roundInfoRes);
        if( testParams.ticketCountLimit != 0) {
            assert.equal(roundInfo.state, "1", "Round state should be Revealing after last bet if tickCountLimit reached");
            assert(roundInfo.revealPeriodEnds >  testParams.revealPeriodLength + revealStartTime - 10, "revealPeriod end should be at least as expected after last bet if tickCountLimit reached");
            assert(roundInfo.revealPeriodEnds < testParams.revealPeriodLength + revealStartTime + 10, "revealPeriod end should be at most as expected after last bet if tickCountLimit reached");
        } else {
            assert.equal(roundInfo.state, "0", "Round state should be still Betting after bet if there is no tickCountLimit");
        }
        assert.equal(roundInfo.ticketCount, testParams.betsToPlace.length, "ticketCount should be set");
        assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0");
        var expFeeAmount = roundInfo.requiredBetAmount.times(testParams.feePt/1000000).times(roundInfo.ticketCount);
        var expCurrentPot = roundInfo.requiredBetAmount.times(roundInfo.ticketCount) - expFeeAmount;
        var expWinnablePot = testParams.requiredBetAmount * testParams.betsToPlace.length - expFeeAmount;
        assert.equal(roundInfo.feeAmount.toString(), expFeeAmount.toString(), "feeAmount should be set");
        assert.equal(roundInfo.currentPotAmount.toString(), expCurrentPot.toString(), "new round currentPotAmount should be set");
        assert.equal(roundInfo.winnablePotAmount.toString(), expWinnablePot.toString(), "new round winnablePotAmount should be set");
        var gameContractBalance = web3.eth.getBalance(gameInstance.address);
        assert.equal(gameContractBalance.toString(),
            gameContractBalanceBefore.add(roundInfo.requiredBetAmount.times(roundInfo.ticketCount)).toString(),
            "contract should receive the requiredBetAmount");
        if( testParams.ticketCountLimit == 0 ) {
            console.log("startRevealing()");
            return gameInstance.startRevealing({from: defaultTxAccount});
        } else {
            return;
        }
    }).then( res => {
        if( testParams.ticketCountLimit == 0) {
            testHelper.logGasUse(testParams.testCaseName, "startRevealing()", "", res);
            assert.equal(res.logs[0].event, "e_RevealStarted", "e_RevealStarted event should be emmitted after startRevealing()");
            assert(res.logs[0].args.revealPeriodEnds >  testParams.revealPeriodLength + revealStartTime - 10, "revealPeriod end should be at least as expected in e_RevealStarted ");
            assert(res.logs[0].args.revealPeriodEnds < testParams.revealPeriodLength + revealStartTime + 10, "revealPeriod end should be at most as expected in e_RevealStarted ");
        }

        return gameInstance.getRoundInfo();
    }).then ( roundInfoRes => {
        var roundInfo = new lupiHelper.RoundInfo(roundInfoRes);
        assert.equal(roundInfo.state, "1", "Round state should be Revealing after startRevealing or after all bets placed");
        assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0 after startRevealing");
        assert(roundInfo.revealPeriodEnds >  testParams.revealPeriodLength + revealStartTime - 10, "revealPeriod end should be at least as expected");
        assert(roundInfo.revealPeriodEnds < testParams.revealPeriodLength + revealStartTime + 10, "revealPeriod end should be at most as expected");
        if (testParams.toRevealCt == 0) {
            return;
        } else {
            var revealBetActions = testParams.betsToPlace.slice(0, testParams.toRevealCt).map(_revealBetFn);
            return Promise.all( revealBetActions );
        }
    }).then( res => {
        return gameInstance.getRoundInfo();
    }).then ( roundInfoRes => {
        var roundInfo = new lupiHelper.RoundInfo(roundInfoRes);
        assert.equal(roundInfo.state, "1", "Round state should be Revealing after reveals");
        assert.equal(roundInfo.ticketCount, testParams.betsToPlace.length, "ticketCount should be set after last bet revealed");
        assert.equal(roundInfo.revealedCount, testParams.toRevealCt, "revealedCount should be set after last bet revealed");
        assert.equal(roundInfo.winningTicket, 0 , "The winningTicket should be yet 0 after revealBets()");
        assert.equal(roundInfo.winningNumber, 0, "The winningNumber should be yet 0 after revealBets()");
        assert.equal(roundInfo.winningAddress, 0, "The winningAddress should be yet 0 after revealBets()");

        playerBalanceBefore = web3.eth.getBalance(playerAddress);
        gameContractBalanceBefore = web3.eth.getBalance(gameInstance.address);
        gameOwnerBalanceBefore = web3.eth.getBalance(gameOwnerAddress);
        // console.log("****** declareWinner", roundInfo.revealPeriodEnds, moment().utc().unix(), web3.eth.getBlock(web3.eth.blockNumber).timestamp);
        return gameInstance.declareWinner({ from: defaultTxAccount});
    }).then( tx => {
        testHelper.logGasUse(testParams.testCaseName, "declareWinner()", "", tx);
        expWinningTicketId = (testParams.expWinningNumber == 0) ? 0 :  testParams.betsToPlace[testParams.expWinningIdx-1].ticketId;
        assert.equal(tx.logs[0].event, "e_WinnerDeclared", "e_WinnerDeclared event should be emmitted");
        assert.equal(tx.logs[0].args.winningTicket , expWinningTicketId, "winningTicket should be set in e_WinnerDeclared event");
        assert.equal(tx.logs[0].args.winningNumber, testParams.expWinningNumber, "winningNumber should be set in e_WinnerDeclared event");
        assert.equal(tx.logs[0].args.winnerAddress, expWinningAddress, "winnerAddress should be set in e_WinnerDeclared event");

        return gameInstance.getRoundInfo();
    }).then ( roundInfoRes => {
        var roundInfo = new lupiHelper.RoundInfo(roundInfoRes);
        assert.equal(roundInfo.state, testParams.expWinningNumber == 0 ? "3" : "2", "Round state should be Won or Tied after declareWinner()");

        assert.equal(roundInfo.winningTicket, expWinningTicketId, "The winningTicket should be set after declareWinner()");
        assert.equal(roundInfo.winningNumber, testParams.expWinningNumber, "The winningNumber should be set after declareWinner()");
        assert.equal(roundInfo.winningAddress, expWinningAddress, "The winningAddress should be set after declareWinner()");
        var gameOwnerBalance = web3.fromWei(web3.eth.getBalance(gameOwnerAddress)).toString();
        var gameContractBalance = web3.fromWei(web3.eth.getBalance(gameInstance.address)).toString();
        var playerBalance = web3.fromWei(web3.eth.getBalance(playerAddress)).toString();
        assert.equal(gameOwnerBalance, web3.fromWei(gameOwnerBalanceBefore.add(roundInfo.feeAmount)).toString(), "the fee should be sent to owner after declareWinner()");
        assert.equal(gameContractBalance, web3.fromWei(gameContractBalanceBefore.minus(roundInfo.feeAmount)).toString(), "the fee should be deducted from contractbalance after declareWinner()");
        assert.equal(playerBalance, web3.fromWei(playerBalanceBefore).toString(), "player balance should be intact (yet) after declareWinner()");

        gameContractBalanceBefore = web3.eth.getBalance(gameInstance.address);
        gameOwnerBalanceBefore = web3.eth.getBalance(gameOwnerAddress);

        if(testParams.expWinningNumber == 0 ) {
            refundActions = testParams.betsToPlace.map(_refundFn);
            var refundResults = Promise.all(refundActions );
            return refundResults.then( refundTxs => {
                return gameInstance.getRoundInfo();
            });
        } else {
            return gameInstance.payWinner({from: defaultTxAccount})
            .then( tx => {
                testHelper.logGasUse(testParams.testCaseName, "payWinner()", "", tx);
                return gameInstance.getRoundInfo();
            });
        }
    }).then( roundInfoRes => {
        var roundInfo = new lupiHelper.RoundInfo(roundInfoRes);
        var gameOwnerBalance = web3.fromWei(web3.eth.getBalance(gameOwnerAddress)).toString();
        var gameContractBalance = web3.fromWei(web3.eth.getBalance(gameInstance.address)).toString();
        var playerBalance = web3.fromWei(web3.eth.getBalance(playerAddress)).toString();
        assert.equal(gameOwnerBalance, web3.fromWei(gameOwnerBalanceBefore).toString(), "the owner balance should be the same after payWinner()");
        assert.equal(gameContractBalance, web3.fromWei(gameContractBalanceBefore.minus(roundInfo.winnablePotAmount)).toString(), "the winnable pot should be deducted from contract balance after payWinner() or refund()");
        if(testParams.expWinningNumber == 0 ) {
            assert.equal(playerBalance, web3.fromWei(playerBalanceBefore.add(testParams.requiredBetAmount).minus(testParams.requiredBetAmount * testParams.feePt / 1000000)).toString(),
               "the requiredBetAmount less fee should be sent to player after refund()");
        } else {
            assert.equal(playerBalance, web3.fromWei(playerBalanceBefore.add(roundInfo.winnablePotAmount)).toString(), "the winnable pot should be sent to winner after payWinner()");
        }
        return Promise.resolve(gameInstance);
    }); // return lupiManager.new...
} // runBettingTest()
