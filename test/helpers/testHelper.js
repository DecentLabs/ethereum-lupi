// globals
global.assert = require('assert');
var moment = require('moment');

var gasUseLog = new Array();

module.exports = {
    logGasUse: logGasUse,
    waitForTimeStamp: waitForTimeStamp,
    expectThrow: expectThrow,
    runInBatch: runInBatch
}

function logGasUse(roundName, tran, args, tx) {
    gasUseLog.push(  [roundName, tran, args, tx.receipt.gasUsed ]);
} //  logGasUse ()

function waitForTimeStamp(waitForTimeStamp) {

    var currentTimeStamp = moment().utc().unix();
    var wait = waitForTimeStamp <= currentTimeStamp ? 1 : waitForTimeStamp - currentTimeStamp; // 0 wait caused tests to be flaky, why?
    console.log("\x1b[2m        ... waiting ", wait, "seconds then sending a dummy tx for blockTimeStamp to reach time required by test ...\x1b[0m");

    return new Promise( resolve => {
            setTimeout(function () {
                var blockTimeStamp = web3.eth.getBlock( web3.eth.blockNumber).timestamp;
                if( blockTimeStamp < waitForTimeStamp ) {
                    web3.eth.sendTransaction({from: web3.eth.accounts[0]}, function(error, res) {
                        if (error) {
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
    const onPrivateChain = web3.version.network == 1976 ? true : false; // set by .runprivatechain.sh (geth ...  --networkid 1976 ..)
    return promise.then( res => {
        if(!onPrivateChain){
            console.log("Received tx instead of throw: \r\n", JSON.stringify(res, null, 4));
            assert.fail('Expected throw not received');
        } // on privatechain we check gasUsed after tx sent
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
        const outOfGasPrivateChain = error.message.search("The contract code couldn't be stored, please check your gas amount.") >= 0;

        const allGasUsed = error.message.search("All gas used") >=0; // we throw this manually after tx b/c on privatechain it doesn't throw :/
        const invalidOpcode1 = error.message.search('VM Exception while processing transaction: invalid opcode') >=0;
        const invalidOpcode2 = error.message.search("VM Exception while executing eth_call: invalid opcode") >= 0;

        assert( invalidOpcode1 || invalidOpcode2 || invalidJump || outOfGas ||
            (onPrivateChain && (outOfGasPrivateChain || allGasUsed) ),
            "Expected solidity throw, got '" + error + "' instead. onPrivateChain: " + onPrivateChain );
        return ;
    });
}; // expectThrow

function runInBatch (dataArray, fnToMap, batchSize) {
    return new Promise( async (resolve,reject) => {
        try {
            var actions, results, ret = new Array();
            var start = 0, end = 0;
            while ( start <  dataArray.length ) {
                end = dataArray.length < start + batchSize ? dataArray.length : start + batchSize;
                process.stdout.write("\r\x1b[2m        Sending " + fnToMap.name + " tx from: " + (start +1) + " to: "
                                    + end + " from total of " + dataArray.length + "                       \x1b[0m");
                actions = dataArray.slice(start, end).map( fnToMap );
                results = Promise.all( actions );
                ret.push( await results);
                start += batchSize;
            }
            process.stdout.write("\n");
            resolve(ret);
        } catch( error) {
            process.stdout.write("\n");
            reject(error);
        }
    });
} // runInBatch()

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
