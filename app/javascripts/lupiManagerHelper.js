const GAS = {
    oraclizeGasPrice: 4000000000, // safe medium: 4 gwei currently http://ethgasstation.info/
    createLupiManager: { gas: 4707806}, // 4513663  4536031 4642887
    setOwner: {gas: 100000}, // ????
    setGasParams: {gas: 100000 }, // ???
    addGame: {gas: 100000 }, // ???
    createGame : { gas: 1100000, price: 0.3 }, // 1,043,055 - 1,073,431 privatechain: 1,062,086 - ??
    scheduleStartRevealing : { gas: 130000 , price: 0.3 }, // testrpc: 123767 privatechain: ???
    startRevealingCallBack: { gas: 100000 }, // testrpc: 80,310 privatechain: ???:
    declareWinnerCallback: { gasBase: 62000, gasPerGuess: 520 },
    revealPerTicketCallback: { gas: 122000 },
    refundPerTicketCallback: { gas: 40000},
    payWinnerCallback: { gas: 40000 }
}

module.exports = {
    GAS: GAS
}
