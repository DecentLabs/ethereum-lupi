// globals
global.assert = require('assert');
var lupi = artifacts.require("./Lupi.sol");
var lupiManager = artifacts.require("./LupiManager.sol");
var BigNumber = require('bignumber.js');
var testHelper = new require('./testHelper.js');
var lupiHelper = new require('../../app/javascripts/LupiHelper.js');
var gas = new require('../../app/javascripts/Gas.js');
var moment = require('moment');

var testParams;

module.exports = {
    TestParams: TestParams,
    runBettingTest: runBettingTest,
    _createGame: _createGame,
    _placeBets: _placeBets,
    _startRevealing: _startRevealing,
    _revealBets: _revealBets,
    _declareWinner: _declareWinner,
    _payWinnerOrRefund: _payWinnerOrRefund
}

async function runBettingTest( _testParams) {
    testParams = _testParams;
    return new Promise( async function (resolve, reject) {
        await _createGame(testParams);
        await _placeBets(testParams);
        if( testParams.ticketCountLimit == 0 ) {
            await _startRevealing();
        }
        if (testParams.toRevealCt > 0) {
            await _revealBets(testParams);
        }
        await _declareWinner(testParams);
        await _payWinnerOrRefund(testParams);
        resolve(testParams.gameInstance);
    }); // return new Promise()
} // runBettingTest()

function TestParams( _testParams) {
    this.accounts = _testParams.accounts;
    this.testCaseName = _testParams.testCaseName;
    this.ticketCountLimit = _testParams.ticketCountLimit;
    this.betsToPlace = _testParams.betsToPlace;
    if (typeof _testParams.toRevealCt == "undefined") {
        this.toRevealCt = this.betsToPlace.length;
    } else {
        this.toRevealCt = _testParams.toRevealCt;
    }
    this.expWinningIdx = _testParams.expWinningIdx;
    this.expWinningNumber = _testParams.expWinningNumber;
    this.bettingPeriodLength = _testParams.bettingPeriodLength;
    this.revealPeriodLength = _testParams.revealPeriodLength;
    this.bettingPeriodEnds = null; // will be set at _createGame
    this.feePt = _testParams.feePt;
    this.requiredBetAmount = _testParams.requiredBetAmount;

    this.defaultTxAccount = this.accounts[0]; // used for declareWinner, payerWinner and refund, needed to avoid polluting owner & player account with tx costs
    this.lastAcccountToUseforBetting = 18;
    this.lupiManagerOwnerAddress = this.accounts[19];
    this.gameOwnerAddress = this.accounts[20];
    this.salt = "0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c";

    this.winnerAccIdx = this.expWinningIdx > this.lastAcccountToUseforBetting ?
                    this.lastAcccountToUseforBetting : this.expWinningIdx;
    this.expWinningAddress = (this.expWinningNumber == 0) ? 0 : this.accounts[this.winnerAccIdx ];
    this.playerAddressForBalanceCheck = this.expWinningAddress == 0 ? this.accounts[1] : this.expWinningAddress;
    var expWinningTicketId; // will be set by _placeBetFn
    this.revealStartTime = 0; //will be set after reveal;
    var lupiManagerInstance, gameInstance; // will be set in _createGame
    this.batchSize = web3.version.network == 1976 ? 2 : 10; // set by .runprivatechain.sh (geth ...  --networkid 1976 ..)

} // TestParams()

async function _createGame( _testParams) {
    _testParams.lupiManagerInstance = await lupiManager.new({from: _testParams.lupiManagerOwnerAddress});

    var lupiManagerOwnerAddress = await _testParams.lupiManagerInstance.owner();
    assert(lupiManagerOwnerAddress, _testParams.lupiManagerOwnerAddress , "lupiManagerOwnerAddress should be set");
    _testParams.bettingPeriodEnds = _testParams.bettingPeriodLength == 0 ? 0 :
                            _testParams.bettingPeriodLength + moment().utc().unix();
    var gasEstimate = gas.lupiManager.createGame.gas;
    var tx = await _testParams.lupiManagerInstance.createGame(_testParams.requiredBetAmount, _testParams.ticketCountLimit, _testParams.bettingPeriodLength,
             _testParams.revealPeriodLength, _testParams.feePt, { from: _testParams.lupiManagerOwnerAddress, gas: gasEstimate});
    if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
    testHelper.logGasUse(_testParams.testCaseName, "lupiManager.createGame()",
                        "requiredBetAmount: " +  web3.fromWei(_testParams.requiredBetAmount)
                        + " | ticketCountLimit: " + _testParams.ticketCountLimit
                        + " | bettingPeriodLength: " + _testParams.bettingPeriodLength
                        + " | revealPeriodLength: " + _testParams.revealPeriodLength
                        , tx);
    assert.equal(tx.logs[1].event, "e_GameCreated", "e_GameCreated event should be emmitted");
    _testParams.gameAddress = tx.logs[1].args.gameAddress;
    _testParams.gameIdx = tx.logs[2].args.gameIdx;
    assert.equal(tx.logs[2].event, "e_GameAdded", "e_GameAdded event should be emmitted");
    assert.equal(tx.logs[2].args.gameIdx, 0, "gameIdx should be set in event");
    assert.equal(tx.logs[1].args.gameAddress, _testParams.gameAddress, "new game address should be set in event");
    assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
    assert.equal(tx.logs[0].args.current, _testParams.lupiManagerOwnerAddress, "new owner should be set in event");
    var res = await _testParams.lupiManagerInstance.games(_testParams.gameIdx);
    assert.equal(res, _testParams.gameAddress, "new game should be added");
    res = await _testParams.lupiManagerInstance.getGamesCount();
    assert.equal(res, 1, "game count should be 1");
    _testParams.gameInstance = lupi.at(_testParams.gameAddress);
    res = await _testParams.gameInstance.owner();
    assert.equal(res, _testParams.lupiManagerOwnerAddress, "new game owner should be the same as lupiManager's owner");
    res = await _testParams.gameInstance.setOwner(_testParams.gameOwnerAddress, {from: _testParams.lupiManagerOwnerAddress});
    assert.equal(res.logs[0].args.current, _testParams.gameOwnerAddress, "new game owner should be set after setOwner");

    var roundInfo = new lupiHelper.RoundInfo(await _testParams.gameInstance.getRoundInfo());
    assert.equal(roundInfo.state, 0, "new game state should be betting");
    assert.equal(roundInfo.requiredBetAmount.toString(), _testParams.requiredBetAmount.toString(), "new game requiredBetAmount should be set");
    assert.equal(roundInfo.ticketCountLimit, _testParams.ticketCountLimit, "new game ticketCountLimit should be set");
    if (_testParams.bettingPeriodLength == 0 ) {
        assert.equal(roundInfo.bettingPeriodEnds, 0, "bettingPeriodEnds end should be 0 whent bettingPeriodLength == 0");
    } else {
        assert(roundInfo.bettingPeriodEnds >= _testParams.bettingPeriodEnds - 1, "bettingPeriodEnds end should be at least bettingPeriodLength + now - 1sec");
        assert(roundInfo.bettingPeriodEnds <= moment().utc().unix() + _testParams.bettingPeriodLength, "bettingPeriodEnds end should be at most bettingPeriodLength + now");
    }
    assert.equal(roundInfo.revealPeriodLength, _testParams.revealPeriodLength, "new game revealPeriodLength should be set");
    assert.equal(roundInfo.feePt, _testParams.feePt, "new game feePt should be set");

    var expBetCount = _testParams.ticketCountLimit == 0 || roundInfo.bettingPeriodEnds != 0 ? 0 : _testParams.ticketCountLimit
    var expFeeAmount = _testParams.requiredBetAmount * _testParams.feePt / 1000000 * expBetCount;
    var expGuaranteedPot = _testParams.requiredBetAmount * expBetCount - expFeeAmount;
    assert.equal(roundInfo.guaranteedPotAmount.toString(), expGuaranteedPot.toString(), "new round guaranteedPotAmount should be set");
    assert.equal(roundInfo.currentPotAmount.toString(), "0", "new round currentPotAmount should be 0");

    return _testParams;
}; // _createGame()

async function _placeBets(_testParams) {
    testParams = _testParams;
    // betsToPlace transformed into a struct array  with playerAddress, encryptedBet  etc.
    for (var i = 0; i < _testParams.betsToPlace.length ; i++){
        // playerAddress is ref to accounts[] (idx+1 to avoid pollutin owner ac with transaction fees)
        var playerAddress;
        if (i+1> _testParams.lastAcccountToUseforBetting ) {
            playerAddress = _testParams.accounts[_testParams.lastAcccountToUseforBetting];
        } else {
            playerAddress = _testParams.accounts[i+1];
        }

        var num , amount, player;
        if (typeof _testParams.betsToPlace[i] == "number") {
            // called first time
            num = _testParams.betsToPlace[i];
            amount = _testParams.requiredBetAmount;
            player = playerAddress;
        } else {
            // when we call second time with same testParams (for edge case tests) then it's already a JSON struct
            num = _testParams.betsToPlace[i].number;
            amount = _testParams.betsToPlace[i].amount;
            player = _testParams.betsToPlace[i].playerAddress;
        }
        _testParams.betsToPlace[i] = { number: num, amount: amount, playerAddress: player, idx: i };
    }

    var gameContractBalanceBefore = web3.eth.getBalance(_testParams.gameInstance.address);
    var playerBalanceBefore = web3.eth.getBalance(_testParams.playerAddressForBalanceCheck);

    await testHelper.runInBatch(_testParams.betsToPlace, _placeBetFn, _testParams.batchSize);

    var roundInfo = new lupiHelper.RoundInfo(await _testParams.gameInstance.getRoundInfo());
    if( _testParams.ticketCountLimit == _testParams.betsToPlace.length && _testParams.ticketCountLimit != 0 ) {
        assert.equal(roundInfo.state, "1", "Round state should be Revealing after last bet if tickCountLimit reached");
        assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0 after last bet if tickCountLimit reached ");
        assert(roundInfo.revealPeriodEnds >  _testParams.revealPeriodLength + _testParams.revealStartTime - 10, "revealPeriod end should be at least as expected after last bet if tickCountLimit reached");
        assert(roundInfo.revealPeriodEnds < _testParams.revealPeriodLength + moment().utc().unix() + 1, "revealPeriod end should be at most as expected after last bet if tickCountLimit reached");
    } else {
        assert.equal(roundInfo.state, "0", "Round state should be still Betting after bet if there is no tickCountLimit");
    }
    assert.equal(roundInfo.ticketCount, _testParams.betsToPlace.length, "ticketCount should be set");
    assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0");

    var expBetCount = _testParams.ticketCountLimit == 0 || roundInfo.bettingPeriodEnds != 0 ? _testParams.betsToPlace.length : _testParams.ticketCountLimit
    var expFeeAmount = _testParams.requiredBetAmount * _testParams.feePt / 1000000 * expBetCount;
    var expCurrentPot = roundInfo.requiredBetAmount.times(roundInfo.ticketCount) - expFeeAmount;
    var expGuaranteedPot = _testParams.requiredBetAmount * expBetCount - expFeeAmount;
    assert.equal(roundInfo.feeAmount.toString(), expFeeAmount.toString(), "feeAmount should be set");
    assert.equal(roundInfo.currentPotAmount.toString(), expCurrentPot.toString(), "new round currentPotAmount should be set");
    assert.equal(roundInfo.guaranteedPotAmount.toString(), expGuaranteedPot.toString(), "new round guaranteedPotAmount should be set");
    var gameContractBalance = web3.eth.getBalance(_testParams.gameInstance.address);
    assert.equal(gameContractBalance.toString(),
        gameContractBalanceBefore.add(roundInfo.requiredBetAmount.times(roundInfo.ticketCount)).toString(),
        "contract should receive the requiredBetAmount");
    return _testParams;
} // _placeBets()

var _placeBetFn = bet => {
    // called for each betsToPlace[] via  Promise.all(). Adds ticketId to bet struct
    return new Promise( async function(resolve, reject) {
        try {
            bet.encryptedBet = await testParams.gameInstance.sealBet(bet.number, testParams.salt, {from: bet.playerAddress});
            var placeBetTime = moment().utc().unix(); // save it so it will be teh revealStartTime if it's the last bet
            var gasEstimate = gas.lupi.placeBetLast.gas;
            var tx = await testParams.gameInstance.placeBet(bet.encryptedBet,
                        { from: bet.playerAddress, value: bet.amount, gas: gasEstimate });
            if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
            bet.ticketId = tx.logs[0].args.ticketId.toNumber();
            testHelper.logGasUse(testParams.testCaseName, "placeBet()", "ticketId: " + bet.ticketId + " | idx: " + bet.idx + " | number: " + bet.number ,  tx);
            assert.equal(tx.logs[0].event, "e_BetPlaced", "e_BetPlaced event should be emmitted");
            assert.equal(tx.logs[0].args.player, bet.playerAddress, "playerAddress should be set in e_BetPlaced event");
            assert.equal(tx.logs[0].args.ticketId, bet.ticketId, "ticketId should be set in e_BetPlaced event");
            if( tx.logs.length == 2 ) { // ticketCountLimit reached, last bet
                // TODO: make sure this event emmitted
                testParams.revealStartTime = placeBetTime;
                assert.equal(tx.logs[1].event, "e_RevealStarted", "e_RevealStarted event should be emmitted after last bet");
                assert(tx.logs[1].args.revealPeriodEnds >  testParams.revealPeriodLength + testParams.revealStartTime - 10, "revealPeriod end should be at least as expected in e_RevealStarted ");
                assert(tx.logs[1].args.revealPeriodEnds < testParams.revealPeriodLength + moment().utc().unix() + 10, "revealPeriod end should be at most as expected in e_RevealStarted ");
            }
            resolve(tx);
        } catch(error) {
            // Commented out debug info to reduce clutter  b/c it's is expected in some test cases
            // var roundInfo = new lupiHelper.RoundInfo( await testParams.gameInstance.getRoundInfo() );
            /* console.log("placeBet() error when placing bet.idx:", bet.idx, "RoundInfo: state:", roundInfo.state.toString(),
                    "ticketCountLimit:", roundInfo.ticketCountLimit, "bettingPeriodEnds:", roundInfo.bettingPeriodEnds,
                    "ticketCount:", roundInfo.ticketCount ); */
            reject(error);
        } // // try-catch
    }); // return new Promise
}; _placeBetFn

async function _startRevealing(_testParams) {
    _testParams.revealStartTime = moment().utc().unix();
    var gasEstimate = gas.lupi.startRevealing.gas;
    var res = await _testParams.gameInstance.startRevealing({from: _testParams.defaultTxAccount, gas: gasEstimate});
    if (res.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
    testHelper.logGasUse(_testParams.testCaseName, "startRevealing()", "", res);
    assert.equal(res.logs[0].event, "e_RevealStarted", "e_RevealStarted event should be emmitted after startRevealing()");
    assert(res.logs[0].args.revealPeriodEnds >  _testParams.revealPeriodLength + _testParams.revealStartTime - 10, "revealPeriod end should be at least as expected in e_RevealStarted ");
    assert(res.logs[0].args.revealPeriodEnds < _testParams.revealPeriodLength + moment().utc().unix() + 10, "revealPeriod end should be at most as expected in e_RevealStarted ");
    var roundInfo = new lupiHelper.RoundInfo( await _testParams.gameInstance.getRoundInfo());
    assert.equal(roundInfo.state, "1", "Round state should be Revealing after startRevealing or after all bets placed");
    assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0 after startRevealing");
    assert(roundInfo.revealPeriodEnds >  _testParams.revealPeriodLength + _testParams.revealStartTime - 10, "revealPeriod end should be at least as expected");
    assert(roundInfo.revealPeriodEnds < _testParams.revealPeriodLength + moment().utc().unix() + 10, "revealPeriod end should be at most as expected");
    return _testParams;
} // _startRevealing()

async function _revealBets(_testParams) {
    testParams = _testParams;
    _testParams.expWinningTicketId = (_testParams.expWinningNumber == 0) ? 0 :  _testParams.betsToPlace[_testParams.expWinningIdx-1].ticketId;
    if (_testParams.revealStartTime == 0) { // first reveal will do startRevealing
        _testParams.revealStartTime = moment().utc().unix();
    }
    await testHelper.runInBatch(_testParams.betsToPlace.slice(0, _testParams.toRevealCt), _revealBetFn, _testParams.batchSize )
    var roundInfo = new lupiHelper.RoundInfo(await _testParams.gameInstance.getRoundInfo());
    assert.equal(roundInfo.state, "1", "Round state should be Revealing after reveals");
    assert.equal(roundInfo.ticketCount, _testParams.betsToPlace.length, "ticketCount should be set after last bet revealed");
    assert.equal(roundInfo.revealedCount, _testParams.toRevealCt, "revealedCount should be set after last bet revealed");
    assert.equal(roundInfo.winningTicket, 0 , "The winningTicket should be yet 0 after revealBets()");
    assert.equal(roundInfo.winningNumber, 0, "The winningNumber should be yet 0 after revealBets()");
    assert.equal(roundInfo.winningAddress, 0, "The winningAddress should be yet 0 after revealBets()");
    return _testParams;
} // _revealBets()

var _revealBetFn = bet => {
    // called for each betsToPlace[] via  Promise.all().
    return new Promise( async function (resolve, reject) {
        try {
            var gasEstimate = gas.lupi.revealBetFirst.gas;
            var revealTx = await testParams.gameInstance.revealBet(bet.ticketId, bet.number, testParams.salt,
                    { from: bet.playerAddress, gas: gasEstimate} ); // TODO: add logic to use gas.lupi.revealBet too
            if (revealTx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
            var revealedEventIdx = 0;
            if( revealTx.logs.length == 2 ) { // this is the first reveal
                assert.equal(revealTx.logs[0].event, "e_RevealStarted", "e_RevealStarted event should be emmitted after first reveal");
                assert(revealTx.logs[0].args.revealPeriodEnds >  testParams.revealPeriodLength + testParams.revealStartTime - 10, "revealPeriod end should be at least as expected in e_RevealStarted ");
                assert(revealTx.logs[0].args.revealPeriodEnds < testParams.revealPeriodLength + testParams.revealStartTime + 10, "revealPeriod end should be at most as expected in e_RevealStarted ");
                revealedEventIdx = 1;
            }
            assert.equal(revealTx.logs[revealedEventIdx].event, "e_BetRevealed", "e_BetRevealed event should be emmitted");
            assert.equal(revealTx.logs[revealedEventIdx].args.player, bet.playerAddress, "playerAddress should be set in e_BetRevealed event");
            assert.equal(revealTx.logs[revealedEventIdx].args.ticketId, bet.ticketId, "ticketId should be set in e_BetRevealed event");
            assert.equal(revealTx.logs[revealedEventIdx].args.bet, bet.number, "bet should be set in e_BetRevealed event");

            testHelper.logGasUse(testParams.testCaseName, "revealBet()", "ticketId: " + bet.ticketId + " | idx: "
            + bet.idx + " | number: " + bet.number, revealTx);
            resolve(revealTx);
        } catch(error) {
            // Commented out debug info to reduce clutter  b/c it's is expected in some test cases
            // var roundInfo = new lupiHelper.RoundInfo( await testParams.gameInstance.getRoundInfo() );
            // console.log("revealBet() error when revealing bet.idx:", bet.idx, "ticketId: ", bet.ticketId, "RoundInfo: state:", roundInfo.state.toString(),
            //        "ticketCountLimit:", roundInfo.ticketCountLimit, "bettingPeriodEnds:", roundInfo.bettingPeriodEnds,
            //        "revealPeriodEnds:", roundInfo.revealPeriodEnds, "ticketCount:", roundInfo.ticketCount, "revealedCount:", roundInfo.revealedCount );
            reject(error);
        } // try-catch
    }); // return new Promise
}; // _revealBetFn()

async function _declareWinner(_testParams) {
    var playerBalanceBefore = web3.eth.getBalance(_testParams.playerAddressForBalanceCheck);
    var gameContractBalanceBefore = web3.eth.getBalance(_testParams.gameInstance.address);
    var gameOwnerBalanceBefore = web3.eth.getBalance(_testParams.gameOwnerAddress);
    var gasEstimate = gas.lupi.declareWinner.gasBase + gas.lupi.declareWinner.gasPerGuess * _testParams.toRevealCt;
    var tx = await _testParams.gameInstance.declareWinner({ from: _testParams.defaultTxAccount,
            gas: gasEstimate })
    if (tx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
    testHelper.logGasUse(_testParams.testCaseName, "declareWinner()", "", tx);
    assert.equal(tx.logs[0].event, "e_WinnerDeclared", "e_WinnerDeclared event should be emmitted");
    assert.equal(tx.logs[0].args.winningTicket.toString(), _testParams.expWinningTicketId.toString(), "winningTicket should be set in e_WinnerDeclared event");
    assert.equal(tx.logs[0].args.winningNumber.toString(), _testParams.expWinningNumber.toString(), "winningNumber should be set in e_WinnerDeclared event");
    assert.equal(tx.logs[0].args.winnerAddress, _testParams.expWinningAddress, "winnerAddress should be set in e_WinnerDeclared event");

    var roundInfo = new lupiHelper.RoundInfo(await _testParams.gameInstance.getRoundInfo());
    assert.equal(roundInfo.state, _testParams.expWinningNumber == 0 ? "3" : "2", "Round state should be Won or Tied after declareWinner()");

    assert.equal(roundInfo.winningTicket, _testParams.expWinningTicketId, "The winningTicket should be set after declareWinner()");
    assert.equal(roundInfo.winningNumber, _testParams.expWinningNumber, "The winningNumber should be set after declareWinner()");
    assert.equal(roundInfo.winningAddress, _testParams.expWinningAddress, "The winningAddress should be set after declareWinner()");
    var gameOwnerBalance = web3.fromWei(web3.eth.getBalance(_testParams.gameOwnerAddress)).toString();
    var gameContractBalance = web3.fromWei(web3.eth.getBalance(_testParams.gameInstance.address)).toString();
    var playerBalance = web3.fromWei(web3.eth.getBalance(_testParams.playerAddressForBalanceCheck)).toString();
    assert.equal(gameOwnerBalance, web3.fromWei(gameOwnerBalanceBefore.add(roundInfo.feeAmount)).toString(), "the fee should be sent to owner after declareWinner()");
    assert.equal(gameContractBalance, web3.fromWei(gameContractBalanceBefore.minus(roundInfo.feeAmount)).toString(), "the fee should be deducted from contractbalance after declareWinner()");
    assert.equal(playerBalance, web3.fromWei(playerBalanceBefore).toString(), "player balance should be intact (yet) after declareWinner()");
    return _testParams;
} // _declareWinner()

function _payWinnerOrRefund(_testParams) {
    testParams = _testParams;
    var gameContractBalanceBefore = web3.eth.getBalance(_testParams.gameInstance.address);
    var gameOwnerBalanceBefore = web3.eth.getBalance(_testParams.gameOwnerAddress);
    var playerBalanceBefore = web3.eth.getBalance(_testParams.playerAddressForBalanceCheck);

    return new Promise( async function(resolve, reject) {
        try {

            if(_testParams.expWinningNumber == 0 ) {
                var refundTxs = await testHelper.runInBatch(_testParams.betsToPlace, _refundFn, _testParams.batchSize);
            } else {
                var gasEstimate = gas.lupi.payWinner.gas;
                var payWinnerTxs = await _testParams.gameInstance.payWinner( { from: _testParams.defaultTxAccount, gas: gasEstimate} )
                if (payWinnerTxs.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
                testHelper.logGasUse(_testParams.testCaseName, "payWinner()", "", payWinnerTxs);
            }
            var roundInfo = new lupiHelper.RoundInfo(await _testParams.gameInstance.getRoundInfo());
            var gameOwnerBalance = web3.fromWei(web3.eth.getBalance(_testParams.gameOwnerAddress)).toString();
            var gameContractBalance = web3.fromWei(web3.eth.getBalance(_testParams.gameInstance.address)).toString();
            var playerBalance = web3.fromWei(web3.eth.getBalance(_testParams.playerAddressForBalanceCheck)).toString();
            assert.equal(gameOwnerBalance, web3.fromWei(gameOwnerBalanceBefore).toString(), "the owner balance should be the same after payWinner()");
            assert.equal(gameContractBalance, web3.fromWei(gameContractBalanceBefore.minus(roundInfo.currentPotAmount)).toString(), "the current pot should be deducted from contract balance after payWinner() or refund()");
            if(_testParams.expWinningNumber == 0 ) {
                assert.equal(playerBalance, web3.fromWei(playerBalanceBefore.add(_testParams.requiredBetAmount).minus(_testParams.requiredBetAmount * _testParams.feePt / 1000000)).toString(),
                   "the requiredBetAmount less fee should be sent to player after refund()");
            } else {
                assert.equal(playerBalance, web3.fromWei(playerBalanceBefore.add(roundInfo.currentPotAmount)).toString(), "the current pot should be sent to winner after payWinner()");
            }
            resolve(_testParams);
        } catch(error) {
            reject(error);
        }
    });
}  // _payWinnerOrRefund()

var _refundFn = bet => {
 // called for each betsToPlace[] via  Promise.all().
 return new Promise( async function (resolve, reject) {
        try {
            var gasEstimate = gas.lupi.refund.gas;
            var refundTx = await testParams.gameInstance.refund(bet.ticketId, { from: testParams.defaultTxAccount, gas: gasEstimate });
            if (refundTx.receipt.gasUsed == gasEstimate) { throw new Error("All gas used") } // hack for expectedThrow() on privatechain
            testHelper.logGasUse(testParams.testCaseName, "refund()", "ticketId: " + bet.ticketId + " | bet idx: "
                    + bet.idx + " | number: " + bet.number, refundTx);
            resolve(refundTx);
        } catch  (error) {
            reject(error);
        }
    }); // return new Promise
}; // _refundFn()
