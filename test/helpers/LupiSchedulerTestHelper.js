var lupiScheduler = artifacts.require("./LupiScheduler.sol");
var gas = new require("../../app/javascripts/Gas.js");
var testHelper = new require('./testHelper.js');

module.exports = {
    newLupiScheduler: newLupiScheduler,
}

function newLupiScheduler() {
    return new Promise( async function (resolve, reject) {
        var gasEstimate = gas.lupiScheduler.createLupiScheduler.gas;
        var instance = await lupiScheduler.new(
            gas.lupiScheduler.oraclizeGasPrice,
            gas.lupiScheduler.startRevealingCallBack.gas,
            gas.lupiScheduler.revealPerTicketCallback.gas,
            gas.lupiScheduler.declareWinnerCallback.gasBase,
            gas.lupiScheduler.declareWinnerCallback.gasPerGuess,
            gas.lupiScheduler.refundPerTicketCallback.gas,
            gas.lupiScheduler.payWinnerCallback.gas,
            {gas: gasEstimate });
        // TODO: how get gasUsed?
        // var tx = await web3.eth.getTransaction(instance.contract.transactionHash);
        // testHelper.logGasUse("x", "new lupiManager", "", tx);
        resolve(instance);
    });
} // newLupiScheduler()
