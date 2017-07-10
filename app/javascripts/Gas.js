async function getDefaultGasPrice() {
    return new Promise( async function (resolve, reject) {
        web3.eth.getGasPrice( function(error,res) {
        if( error) {
            console.error("getDefaultGasPrice () error.", error);
            reject(error);
        }
        var defaultGasPrice = typeof res == "undefined" || res.toNumber() == 0 ? 20000000 : res.toNumber();
        resolve(defaultGasPrice);
        }); // getGasPrice
    }); // return new Promise
} // getDefaultGasPrice

const lupiManager = {
    setOwner: {gas: 100000}, // ????
    addGame: {gas: 100000 }, // ???
    createGame : { gas: 1100000, price: 0.3 }, // 1,043,055 - 1,073,431 privatechain: 1,062,086 - ??
}

const lupiScheduler = {
    oraclizeGasPrice: 4000000000, // safe medium: 4 gwei currently http://ethgasstation.info/
    createLupiScheduler: { gas: 4707806}, // 4513663  4536031 4642887
    setOwner: {gas: 100000}, // ????
    setGasParams: {gas: 100000 }, // ???
    startRevealingCallBack: { gas: 150000 }, // testrpc: 133636 privatechain: ???:
    declareWinnerCallback: { gasBase: 82000, gasPerGuess: 520 }, // TODO: check it on privatechain
    revealPerTicketCallback: { gas: 122000 },
    refundPerTicketCallback: { gas: 40000},
    payWinnerCallback: { gas: 40000 },
    scheduleStartRevealing : { gas: 130000 , price: 0.3 } // testrpc: 123767 privatechain: ???
}

const lupi = {
    // we can only use estimate for last because other bets could have landed since ui refresh ..
    placeBet : { gas: 99000, price: 1 }, // 96,494 - 96,552 but 98,114 - 98,322 on privatechain
    placeBetLast : { gas: 150000, price: 1 }, // testrcp: 138,116 - 140,722 privatechain: 140,722 - 140,786

    startRevealing : { gas: 66000, price: 0.3 }, // testrpc: 63,180  privatechain: 64,120

    // these are for revealing a unique number gas which is higher but we can't safely predict if it's unique or not
    revealBetFirst : { gas: 195000, price: 1 }, // testrcp: 147,816 - 189,379 privatechain: 193604 - 193,668
    revealBet : { gas: 122000, price: 1 }, // testrcp: 117,816. privatechain: 121,205  (non unique: 80498)

    // It's the declareWinner when there is winner. non winner is 20k cheaper but might not worth the effort to predict
    // testrpc: 57,070 +ca. 270 per guess for up to 10, then 224 per guess up to 100
    // privatechain: 61,040 + ca. 516 per bet (up to 100)
    declareWinner : { gasBase: 62000, price: 0.3, gasPerGuess: 520 },

    // had to set refund & payWinner higher b/c "base fee exceeds gas limit"
    refund : { gas: 40000, price: 0.3 }, // testrpc: 19,244 privatechain: 21,304
    payWinner : { gas: 40000, price: 0.3 } // testrpc: 19,575 privatechain: 21,815
};

module.exports = {
    getDefaultGasPrice: getDefaultGasPrice,
    lupi: lupi,
    lupiManager: lupiManager,
    lupiScheduler: lupiScheduler
}
