var lupiManager = artifacts.require("./LupiManager.sol");
var lupiManagerHelper = new require("../app/javascripts/LupiManagerHelper.js");

module.exports = function(deployer, network) {
    deployer.deploy(lupiManager,
        lupiManagerHelper.GAS.oraclizeGasPrice,
        lupiManagerHelper.GAS.startRevealingCallBack.gas,
        lupiManagerHelper.GAS.revealPerTicketCallback.gas,
        lupiManagerHelper.GAS.declareWinnerCallback.gasBase,
        lupiManagerHelper.GAS.declareWinnerCallback.gasPerGuess,
        lupiManagerHelper.GAS.refundPerTicketCallback.gas,
        lupiManagerHelper.GAS.payWinnerCallback.gas)
    .then( res => {
        console.log("    Deploying lupiManager - If you get VM Exception then check if ethereum-bridge is deployed with npm run bridge:deploy (This VM exception needs to be fixed..)");
        return lupiManager.deployed();
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
        console.log("2_deploy_LupiManager.js: Oraclize contract found. oraclize_cbAddress:", res);
    });

};
