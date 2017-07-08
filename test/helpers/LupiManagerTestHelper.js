var lupiManager = artifacts.require("./LupiManager.sol");
var lupiManagerHelper = new require("../../app/javascripts/LupiManagerHelper.js");
var testHelper = new require('./testHelper.js');

module.exports = {
    newLupiManager: newLupiManager,
}

function newLupiManager( ) {
    return new Promise( async function (resolve, reject) {
        var gasEstimate = lupiManagerHelper.GAS.createLupiManager.gas;
        var instance = await lupiManager.new(
            lupiManagerHelper.GAS.oraclizeGasPrice,
            lupiManagerHelper.GAS.startRevealingCallBack.gas,
            lupiManagerHelper.GAS.revealPerTicketCallback.gas,
            lupiManagerHelper.GAS.declareWinnerCallback.gasBase,
            lupiManagerHelper.GAS.declareWinnerCallback.gasPerGuess,
            lupiManagerHelper.GAS.refundPerTicketCallback.gas,
            lupiManagerHelper.GAS.payWinnerCallback.gas,
            {gas: gasEstimate });
        // TODO: how get gasUsed?
        // var tx = await web3.eth.getTransaction(instance.contract.transactionHash);
        // testHelper.logGasUse("x", "new lupiManager", "", tx);
        resolve(instance);
    });
} // newLupiManager()
