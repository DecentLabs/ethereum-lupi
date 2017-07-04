
const GAS =
    {
        createGame : { gas: 1100000, price: 0.3 }, // 1,043,055 - 1,073,431 privatechain: 1,062,086 - ??

        // we can only use estimate for last because other bets could have landed since ui refresh ..
        placeBet : { gas: 99000, price: 1 }, // 96,494 - 96,552 but 98,114 - 98,322 on privatechain
        placeBetLast : { gas: 150000, price: 1 }, // testrcp: 138,116 - 140,722 privatechain: 140,722 - 140,786

        startRevealing : { gas: 63180, price: 0.3 }, // testrpc: 63,180  privatechain: ?

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
