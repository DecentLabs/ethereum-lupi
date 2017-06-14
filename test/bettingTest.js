var lupi = artifacts.require("./Lupi.sol");
var BigNumber = require('bignumber.js');

contract("Lupi", function(accounts) {
    /*  TODO:
        - move common test functions to shared .js
        - test bet after ticketCountLimit reached (assert VM exception)
        - test bet with invalid betAmount
        - test bet for someone else
        - test calling reveal before limit reached and/or roundOver
        - test calling closeBetting before limit reached
    */
    var instance, ownerAddress;
    var gasUseLog = new Array();
    var salt = "0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c";
    var requiredBetAmount = new BigNumber(1000000000000000000);
    var ticketCountLimit = 1;
    var feePt = 10000;

    before(function(done) {
        lupi.new(requiredBetAmount, ticketCountLimit, feePt)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            done();
        });
    }); // before()

    function logGasUse(tran, tx) {
        gasUseLog.push(  [tran, tx.receipt.gasUsed ]);
    } //  logGasUse ()

    function parseRoundInfo(result) {
      return {
        state: result[0],
        requiredBetAmount: result[1],
        feePt: result[2].toNumber(),
        ticketCountLimit: result[3].toNumber(),
        ticketCount: result[4].toNumber(),
        revealedCount: result[5].toNumber(),
        feeAmount: result[6],
        winnablePot: result[7],
        winningTicket: result[8],
        winningNumber: result[9]
      }
    }

    var _placeBetFn = function ( bet) {
        // called for each placebet via  Promise.all() in placeBet(). adds ticketId to bet struct
        return new Promise(resolve => resolve(
            instance.sealBet(bet.playerAddress, bet.number, salt, {from: bet.playerAddress})
            .then( sealRes => {
                bet.encryptedBet = sealRes;
                return instance.placeBet(sealRes, {from: bet.playerAddress, value: bet.amount})
            }).then( tx => {
                bet.ticketId = tx.logs[0].args.ticketId.toNumber() ;
                logGasUse("placeBet() ticketId: " + bet.ticketId + " | bet idx: " + bet.idx + " | number: " + bet.number ,  tx);
                return tx;
            })
        )); // return new Promise
    }; _placeBetFn

    function placeBets(bets, betAmount) {
        // pass bets[1,2,3] with  numbers to bet
        // passed argument array trasnformed int a struct array  with playerAddress, encryptedBet  etc.
        // returns  roundInfo parsed into a struct
        for (var i = 0; i < bets.length ; i++){
            // playerAddress is ref to accounts[] (idx+1 to avoid pollutin owner ac with transaction fees)
            // TODO: better way to pass these ?
            bets[i] = { number: bets[i], amount: betAmount, playerAddress: accounts[i+1], idx: i };
        }

        var placeBetActions = bets.map(_placeBetFn);
        var placeBetResults = Promise.all( placeBetActions );

        return placeBetResults.then( betsTxs => {
            return instance.getRoundInfo()
        }).then( roundInfoRes => {
            return parseRoundInfo(roundInfoRes);
        });
    } // placeBetFn

    var _revealBetFn = function ( bet) {
        // called for each bets[] via  Promise.all() in placeBet(). adds ticketId to bet struct
        return new Promise(resolve => resolve(
            // TODO: change this to call revealBet(uint _ticket, uint _bet, bytes32 _salt)
            instance.revealBet(bet.playerAddress, bet.ticketId, bet.number, salt, {from: bet.playerAddress})
            .then( revealTx => {
                logGasUse("revealBet() ticketId: " + bet.ticketId + " | bet idx: "
                    + bet.idx + " | number: " + bet.number, revealTx);
                return revealTx;
            })
        )); // return new Promise
    }; // _revealBetFn()

    function revealBets(bets) {
        // bets: struct created by placeBets
        // returns  roundInfo parsed into a struct
        var revealBetActions = bets.map(_revealBetFn);
        var results = Promise.all( revealBetActions );

        return results.then( function (revealTxs) {
          return instance.getRoundInfo();
        }).then (function (roundInfoRes) {
            return parseRoundInfo(roundInfoRes);
        });
    } // revealBets()

    it('should be possible to play a round with 1 bet', function(done) {
        var betsToPlace = [2];
        var contractBalanceBefore = web3.eth.getBalance(instance.address);

        placeBets(betsToPlace, requiredBetAmount)
        .then( roundInfo => {
            assert.equal(roundInfo.state, "0", "Round state should be still Betting after bet");
            assert.equal(roundInfo.ticketCount, 1, "ticketCount should be 1");
            assert.equal(roundInfo.revealedCount, 0, "revealedCount should be 0");
            var expFeeAmount = roundInfo.requiredBetAmount.times(roundInfo.feePt/1000000).times(roundInfo.ticketCount);
            var expWinnablePot = roundInfo.requiredBetAmount.times(roundInfo.ticketCount) - expFeeAmount;
            assert.equal(roundInfo.feeAmount.toString(), expFeeAmount.toString(), "feeAmount should be set");
            assert.equal(roundInfo.winnablePot.toString(), expWinnablePot.toString(), "new round winnablePot should be set");
            var contractBalance = web3.eth.getBalance(instance.address);
            assert.equal(contractBalance.toString(), contractBalanceBefore.add(roundInfo.requiredBetAmount).toString(), "contract should receive the requiredBetAmount");

            return revealBets(betsToPlace);
        }).then( roundInfo => {
            assert.equal(roundInfo.state, "1", "Round state should be Revealing after last bet revealed");
            assert.equal(roundInfo.ticketCount, 1, "ticketCount should be 1");
            assert.equal(roundInfo.revealedCount, 1, "revealedCount should be 1");

            return instance.declareWinner();
        }).then( tx => {
            logGasUse("declareWinner()", tx);
            return instance.getRoundInfo();
        }).then (function (roundInfoRes) {
            //console.log(roundInfoRes);
            // TODO: asserts (fee, etc).. and then payWinner()
            done();
        });
    }); // should be possible to play a round with 1 bet

    /* TODO: it('should be possible to play a round with 4 bets', function(done) {
        var sealedBet = 0x8eee4611778dd1659049d56a6f0ead527aad090d423fdc19c1407f586aa5ebff;
        var playerBalanceBefore;
        var betsToPlace = [2,3,2,3];

        playerBalanceBefore = web3.eth.getBalance(accounts[1]);
        placeBets(betsToPlace, requiredBetAmount)
        .then( res => {
            console.log("placeBetRes: ", res);
            assert(false, "test TODO");
            done();
        });
    }); */

    /*it('should be possible to reveal a bet', function() {
        var sealedBet = 0x3b38b891f95913208ac1d002d2e838266c1004783ee9633a01439d649c6978e1;

        assert(false, "test TODO");
    });
    */
    after( function() {
      // runs after all tests in this block
      console.log("=========== GAS USAGE STATS ===========");
      console.log("transaction,  gas used");
      console.log(gasUseLog);
  }); // after()

}); // contract("lupi")
