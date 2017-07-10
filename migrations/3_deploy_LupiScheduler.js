var lupiScheduler = artifacts.require("./LupiScheduler.sol");
var gas = new require("../app/javascripts/Gas.js");

module.exports = function(deployer, network) {
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
        return instance.getOraclizeCbAddress();
    }).then( res => {
        if (typeof res == "undefined") {
            var err = "\x1b[31mError after deploying lupiManager: oraclize_cbAddress() is not set.\x1b[0m"
                + "\r\n    If you are on testrpc or privatechain then make sure you run ethereum-bridge:"
                + "\r\n        npm run bridge:start\r\n";
            //console.log(err);
            throw new Error(err);
        }
        console.log("3_deploy_LupiScheduler.js: Oraclize contract found. oraclize_cbAddress:", res);
    });

};
