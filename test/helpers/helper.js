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
    winnablePot: result[8],
    winningTicket: result[9].toNumber(),
    winningAddress: result[10],
    winningNumber: result[11].toNumber(),
    revealPeriodEnds: result[12].toNumber()
  }
}

/* function unlockAccounts( accounts) { // it's for testnetwork but couldn't dedect if we are on testrpc so just doing it from commandline
    for (var i = 0; i < accounts.length; i++) {
        web3.personal.unlockAccount(accounts[i], "1234", 60000);
    }
}; */

module.exports = {
    parseRoundInfo: parseRoundInfo,
    logGasUse: logGasUse

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
