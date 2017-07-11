var lupiScheduler = artifacts.require("./LupiScheduler.sol");
var gas = new require("../app/javascripts/Gas.js");
var lupiSchedulerInstance;

module.exports = function(deployer, network, accounts) {
    deployer.deploy(lupiScheduler,
        gas.lupiScheduler.oraclizeGasPrice,
        gas.lupiScheduler.startRevealingCallBack.gas,
        gas.lupiScheduler.revealPerTicketCallback.gas,
        gas.lupiScheduler.declareWinnerCallback.gasBase,
        gas.lupiScheduler.declareWinnerCallback.gasPerGuess,
        gas.lupiScheduler.refundPerTicketCallback.gas,
        gas.lupiScheduler.payWinnerCallback.gas,
        { gas: gas.lupiScheduler.createLupiScheduler.gas } )
    .then( res => {
        console.log("    Deploying LupiScheduler - If you get VM Exception then check if ethereum-bridge is deployed with npm run bridge:deploy (This VM exception needs to be fixed..)");
        return lupiScheduler.deployed();
    }).then( instance => {
        lupiSchedulerInstance = instance;
        return lupiSchedulerInstance.getOraclizeCbAddress();
    }).then( res => {
        if (typeof res == "undefined") {
            var err = "\x1b[31mError after deploying lupiManager: oraclize_cbAddress() is not set.\x1b[0m"
                + "\r\n    If you are on testrpc or privatechain then make sure you run ethereum-bridge:"
                + "\r\n        npm run bridge:start\r\n";
            //console.log(err);
            throw new Error(err);
        }
        console.log("3_deploy_LupiScheduler.js: Oraclize contract found. oraclize_cbAddress:", res);
        var onTestRpc = web3.version.network == 999 ? true : false;
        if( onTestRpc) {
            console.log("on testrpc. Sending 10 ETH to lupiScheduler");
            console.log(lupiSchedulerInstance.address);
            return web3.eth.sendTransaction({from:accounts[0], to: lupiSchedulerInstance.address, value: web3.toWei(10)})
        } else {
            return;
        }
    });

};
