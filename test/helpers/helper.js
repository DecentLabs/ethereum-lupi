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
    ticketCount: result[4].toNumber(),
    revealedCount: result[5].toNumber(),
    feeAmount: result[6],
    winnablePot: result[7],
    winningTicket: result[8].toNumber(),
    winningAddress: result[9],
    winningNumber: result[10].toNumber()
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
