//var lupi = artifacts.require("./Lupi.sol");
// var BigNumber = require('bignumber.js');
//var helper = new require('./helpers/helper.js');

contract("Lupi betting edge case tests", accounts => {
    it("shouldn't be possible to reveal a bet when the reveal period is over even if there are unreavealed bets"); // we only tested the case when all bets revealed
    it("shouldn't be able to placeBet with 0 number"), // assert VM exception
    it("shouldn't be able to placeBet with negative number"),
    it("shouldn't be able to placeBet with invalid betAmount"), // assert VM exception
    it("shouldn't be able to placeBet after ticketCountLimit reached" ), // (assert VM exception))
    it("should be able to placeBet and revealBet for someone else"),
    it("shouldn't be able to startRevealing before ticketCountLimit reached"), // assert VM exception
    it("shouldn't be able to declareWinner before ticketCountLimit reached "), // assert VM exception)
    it("shouldn't be abel to refund when round is not closed yet"), // assert VM exception
    it("shouldn't be able to refund when there is a winner"), // assert VM exception
    it("shouldn't be able to payWinner when round not closed"), // assert VM exception
    it("shouldn't be able to payWinner when there is no winner"), // assert VM exception
    it("shouldn't be able to refund with invalid ticketId request"), // assert VM exception
    it("shouldn't be possible to pay a winner twice") // assert VM exception
    it("shouldn't be possible to refund a bet twice") // assert VM exception
})
