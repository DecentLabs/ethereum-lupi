
module.exports = {
    Ticket: Ticket,
    RoundInfo: RoundInfo,
    toHexString: toHexString
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
