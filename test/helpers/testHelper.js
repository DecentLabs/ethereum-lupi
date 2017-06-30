// globals
global.assert = require('assert');
var moment = require('moment');

var gasUseLog = new Array();

module.exports = {
    logGasUse: logGasUse,
    waitForTimeStamp: waitForTimeStamp,
    expectThrow: expectThrow
}

function logGasUse(roundName, tran, args, tx) {
    gasUseLog.push(  [roundName, tran, args, tx.receipt.gasUsed ]);
} //  logGasUse ()

function waitForTimeStamp(waitForTimeStamp) {

    var currentTimeStamp = moment().utc().unix();
    var wait =  waitForTimeStamp - currentTimeStamp;
    wait = wait < 0 ? 0 : wait;

    return new Promise( resolve => {
            setTimeout(function () {
                console.log("... waiting ", wait, "seconds then sending a dummy tx for blockTimeStamp to reach time required by test ...");
                var blockTimeStamp = web3.eth.getBlock( web3.eth.blockNumber).timestamp;
                if( blockTimeStamp < waitForTimeStamp ) {
                    web3.eth.sendTransaction({from: web3.eth.accounts[0]}, function(error, res) {
                        if (error) {
                            console.log("waitForTimeStamp() web3.eth.sendTransaction() error")
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            }, wait * 1000);
    });

} // waitForTimeStamp()

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


after( function() {
    // runs after all tests
    if(gasUseLog.length > 0 ) {
        // console.log("full title:", this.parent.fullTitle()); // CHECK: why doesn't it work?
        console.log("===================  GAS USAGE STATS " + "" + " ===================");
        console.log("testround, transaction, args, gas used");
        //console.log(gasUseLog);
        var sum = 0;
        for (var i =0; i < gasUseLog.length; i++) {
            console.log('"' + gasUseLog[i][0] + '", "' + gasUseLog[i][1] + '", "' + gasUseLog[i][2] + '", ' + gasUseLog[i][3]);
            sum += gasUseLog[i][3];
        }

        console.log("=========== Total gas usage : " + sum);
    }
}); // after()
