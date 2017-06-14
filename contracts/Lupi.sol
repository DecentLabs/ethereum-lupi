pragma solidity ^0.4.11;

import "./Owned.sol";

contract Lupi is owned {
    // round parameters, set only in constructor
    uint public requiredBetAmount;
    uint public ticketCountLimit;
    uint public feePt; // feePt in parts per million , ie. 10,000 = 1%

    struct Ticket {
        address player;
        uint deposit;
        bytes32 secretBet;
        uint revealedBet;
    }

    enum State { Betting, Revealing, Closed }

    State state = State.Betting;

    Ticket[] tickets;
    uint revealedCount;

    // bet => tickets
    mapping(uint => uint[]) revealedTickets;
    uint[] uniqueBets;

    uint winningTicket;

    // TODO: function getBets(address _player) constant returns bets[]

    function Lupi(uint _requiredBetAmount, uint _ticketCountLimit, uint _feePt ) {
        require(_ticketCountLimit > 0);
        requiredBetAmount = _requiredBetAmount;
        ticketCountLimit = _ticketCountLimit;
        feePt = _feePt;
        // ticket zero is reserved
        tickets.push(Ticket(0, 0, 0, 0)); // TODO: shall we replace this for a more readable logic?
    }

    function getRoundInfo() constant returns ( // FIXME: state doesn't seem to work
            State _state, uint _requiredBetAmount, uint _feePt, uint _ticketCountLimit,
            uint _ticketCount, uint _revealedCount,
            uint  winnablePotAmount) {
        return ( state, requiredBetAmount, feePt, ticketCountLimit,
            tickets.length -1, revealedCount,
            (tickets.length -1) * requiredBetAmount - getFeeAmount());
    }

    function getFeeAmount() constant returns (uint feeAmount) {
        return (tickets.length - 1) * requiredBetAmount * feePt / 1000000;
    }

    function sealBet(uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        return sealBet(msg.sender, _bet, _salt);
    }

    function sealBet(address _player, uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        require(_bet != 0);
        return keccak256(_player, _bet, _salt);
    }

    function placeBet(bytes32 _secretBet) payable returns (uint ticket) {
        require(state == State.Betting);
        require(msg.value == requiredBetAmount);
        require(ticketCountLimit < tickets.length -1);
        return tickets.push(Ticket(msg.sender, msg.value, _secretBet, 0)) - 1;
    }

    function bettingOver() {
        require(state == State.Betting );
        require(ticketCountLimit == tickets.length -1 );
        state = State.Revealing;
    }

    function revealBet(uint _ticket, uint _bet, bytes32 _salt) {
        revealBet(msg.sender, _ticket, _bet, _salt);
    }

    // IDEA incentivize reveals with paying back a reserve
    function revealBet(address _player, uint _ticket, uint _bet, bytes32 _salt) {
        if (state == State.Betting) {
            bettingOver();
        }
        require (state == State.Revealing);
        require (_bet != 0);

        Ticket ticket = tickets[_ticket];
        if (ticket.revealedBet != 0) {
            // already revealed
            return;
        }

        bytes32 sealed = sealBet(_player, _bet, _salt);
        if (ticket.secretBet != sealed) throw;
        ticket.revealedBet = _bet;

        uint[] ids = revealedTickets[_bet];
        if (ids.length == 0) {
            uniqueBets.push(_bet);
        }
        ids.push(_ticket);

        revealedCount++;
    }

    // IDEA make this iterative, so it scales indefinitely
    function declareWinner() {
        // TODO assert current time is after reveal period
        // TODO: deduct fee
        require(state == State.Revealing);
        state = State.Closed;
        uint lowestBet;
        uint lowestTicket;
        for (uint i = 0; i < uniqueBets.length; i++) {
            uint bet = uniqueBets[i];
            if (lowestBet == 0 || bet < lowestBet) {
                uint[] ids = revealedTickets[bet];
                if (ids.length == 1) {
                    lowestBet = bet;
                    lowestTicket = ids[0];
                }
            }
        }
        winningTicket = lowestTicket;
    }

    function payWinner() {
        require(state == State.Closed);
        require(winningTicket != 0);
        // all money goes to winner
        tickets[winningTicket].player.transfer(this.balance);
    }

    function refund(uint _ticket) {
        require(state == State.Closed);
        require(winningTicket == 0);
        Ticket ticket = tickets[_ticket];
        uint value = ticket.deposit;
        ticket.deposit = 0;
        ticket.player.transfer(value);
    }

}
