
const GAS =
    {
        createGame : { gas: 1100000, price: 0.3 }, // 1,043,055 - 1,073,431
        // we can only use estimate for last because other bets could have landed since ui refresh ..
        placeBet : { gas: 98000, price: 1 }, // 96,494 - 96,552
        placeBetLast : { gas: 140000, price: 1 }, // 138,116
        startRevealing : { gas: 63180, price: 0.3 }, // 63,180
        // these are for revealing a unique number gas which is higher but we can't safely predict if it's unique or not
        revealBetFirst : { gas: 150000, price: 1 }, // 147,816 - 149,355
        revealBet : { gas: 120000, price: 1 }, // 117,816
        // that's the declareWinner when there is winner. non winner is 20k cheaper but might not worth the effort to predict
        declareWinner : { gasBase: 57000, price: 0.3, gasPerGuess: 270 },// 57,070 +ca. 270 per guess for up to 10, then 224 per guess up to 100
        refund : { gas: 40000, price: 0.3 }, // 19,244 (had to set higher b/c "base fee exceeds gas limit" error)
        payWinner : { gas: 40000, price: 0.3 } // 19,575
    };

module.exports = {
    Ticket: Ticket,
    RoundInfo: RoundInfo,
    toHexString: toHexString,
    GAS: GAS
}

function Ticket(ticketId, guess, salt, account, isRevealed) {
    this.ticketId = ticketId;
    this.guess = guess;
    this.salt = salt;
    this.account = account;
    this.isRevealed = isRevealed;
} // Ticket()


function RoundInfo(result) {
    this.state = result[0];
    this.requiredBetAmount = result[1];
    this.feePt = result[2].toNumber();
    this.ticketCountLimit = result[3].toNumber();
    this.bettingPeriodEnds = result[4].toNumber();
    this.revealPeriodLength = result[5].toNumber();
    this.ticketCount = result[6].toNumber();
    this.revealedCount = result[7].toNumber();
    this.feeAmount = result[8];
    this.guaranteedPotAmount = result[9];
    this.currentPotAmount = this.requiredBetAmount.times(this.ticketCount).minus(this.feeAmount) ;
    this.winningTicket = result[10].toNumber();
    this.winningAddress = result[11];
    this.winningNumber = result[12].toNumber();
    this.revealPeriodEnds = result[13].toNumber();
} // RoundInfo()

function toHexString(byteArray) {
    return byteArray.map(function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
} // toHexString()
