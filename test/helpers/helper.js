// globals
global.assert = require('assert');

var gasUseLog = new Array();

function logGasUse(roundName, tran, tx) {
    gasUseLog.push(  [roundName, tran, tx.receipt.gasUsed ]);
} //  logGasUse ()

function parseRoundInfo(result) {
  return {
    state: result[0],
    requiredBetAmount: result[1],
    feePt: result[2].toNumber(),
    ticketCountLimit: result[3].toNumber(),
    revealPeriodLength: result[4].toNumber(),
    ticketCount: result[5].toNumber(),
    revealedCount: result[6].toNumber(),
    feeAmount: result[7],
    winnablePotAmount: result[8],
    currentPotAmount: result[9],
    winningTicket: result[10].toNumber(),
    winningAddress: result[11],
    winningNumber: result[12].toNumber(),
    revealPeriodEnds: result[13].toNumber()
  }
}

/* function unlockAccounts( accounts) { // it's for testnetwork but couldn't dedect if we are on testrpc so just doing it from commandline
    for (var i = 0; i < accounts.length; i++) {
        web3.personal.unlockAccount(accounts[i], "1234", 60000);
    }
}; */

function expectThrow (promise) {
    return promise.then( res => {
        assert.fail('Expected throw not received');
        return;
    }).catch( error => {
        // TODO: Check jump destination to destinguish between a throw
        //       and an actual invalid jump.
        const invalidJump = error.message.search('invalid JUMP') >= 0;
        // TODO: When we contract A calls contract B, and B throws, instead
        //       of an 'invalid jump', we get an 'out of gas' error. How do
        //       we distinguish this from an actual out of gas event? (The
        //       testrpc log actually show an 'invalid jump' event.)
        const outOfGas = error.message.search('out of gas') >= 0;
        const invalidOpcode = error.message.search('VM Exception while processing transaction: invalid opcode') >=0;
        assert( invalidOpcode || invalidJump || outOfGas, "Expected throw, got '" + error + "' instead", );
        return ;
    });
}; // expectThrow


module.exports = {
    parseRoundInfo: parseRoundInfo,
    logGasUse: logGasUse,
    expectThrow: expectThrow
}

after( function() {
    // runs after all tests
    if(gasUseLog.length > 0 ) {
        // console.log("full title:", this.parent.fullTitle()); // CHECK: why doesn't it work?
        console.log("===================  GAS USAGE STATS " + "" + " ===================");
        console.log("testround, transaction,  gas used");
        //console.log(gasUseLog);
        var sum = 0;
        for (var i =0; i < gasUseLog.length; i++) {
            console.log('"' + gasUseLog[i][0] + '", "' + gasUseLog[i][1] + '", ' + gasUseLog[i][2]);
            sum += gasUseLog[i][2];
        }

        console.log("=========== Total gas usage : " + sum);
    }
}); // after()
