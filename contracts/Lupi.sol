pragma solidity ^0.4.11;

import "./Owned.sol";

contract Lupi is owned {
    // round parameters, set only in constructor
    uint public requiredBetAmount;
    uint public ticketCountLimit;
    uint public feePt; // feePt in parts per million , ie. 10,000 = 1%
    uint public revealPeriodLength;
    uint public revealPeriodEnds; // set when revealing started

    struct Ticket {
        address player;
        uint deposit;
        bytes32 secretBet;
        uint revealedBet;
    }

    enum State { Betting, Revealing, Won, Tied }

    State public state = State.Betting;

    Ticket[] public tickets;
    uint public revealedCount;

    // bet => tickets
    mapping(uint => uint[]) public revealedTickets;
    uint[] public uniqueBets;

    uint public winningTicket;

    // TODO: function getBets(address _player) constant returns bets[]

    function Lupi(uint _requiredBetAmount, uint _ticketCountLimit, uint _revealPeriodLength, uint _feePt ) {
        require(_ticketCountLimit > 0);
        require(_revealPeriodLength > 0);
        requiredBetAmount = _requiredBetAmount;
        ticketCountLimit = _ticketCountLimit;
        revealPeriodLength = _revealPeriodLength;
        feePt = _feePt;
        // ticket zero is reserved
        tickets.length = 1;
    }

    function getRoundInfo() constant returns (
            State _state, uint _requiredBetAmount, uint _feePt, uint _ticketCountLimit, uint _revealPeriodLength,
            uint _ticketCount, uint _revealedCount,
            uint _feeAmount,
            uint _winnablePotAmount,
            uint _winningTicket,
            address _winningAddress,
            uint _winningNumber,
            uint _revealPeriodEnds) {
        return ( state, requiredBetAmount, feePt, ticketCountLimit, revealPeriodLength,
            tickets.length -1, revealedCount,
            getFeeAmount(),
            getWinnablePotAmount(),
            winningTicket,
            tickets[winningTicket].player,
            tickets[winningTicket].revealedBet,
            revealPeriodEnds);
    }

    function getFeeAmount() constant returns (uint feeAmount) {
        return (tickets.length - 1) * requiredBetAmount * feePt / 1000000;
    }

    function getWinnablePotAmount() constant returns (uint winnablePot) {
        return (tickets.length -1) * requiredBetAmount - getFeeAmount() ;
    }

    function sealBet(uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        return sealBetForAddress(msg.sender, _bet, _salt);
    }

    function sealBetForAddress(address _player, uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        require(_bet != 0);
        return keccak256(_player, _bet, _salt);
    }

    event e_BetPlaced (uint indexed ticketId);
    function placeBet(bytes32 _secretBet) payable returns (uint ticket) {
        require(state == State.Betting);
        require(msg.value == requiredBetAmount);
        require( tickets.length < ticketCountLimit + 1 );
        ticket = tickets.push(Ticket(msg.sender, msg.value, _secretBet, 0)) - 1;
        e_BetPlaced(ticket);
        return ticket;
    }

    function startRevealing() {
        require(state == State.Betting );
        require(ticketCountLimit == tickets.length -1 );
        state = State.Revealing;
        revealPeriodEnds = now + revealPeriodLength;
    }

    function revealBet(uint _ticket, uint _bet, bytes32 _salt) {
        revealBetForAddress(msg.sender, _ticket, _bet, _salt);
    }

    // IDEA incentivize reveals with paying back a reserve
    function revealBetForAddress(address _player, uint _ticket, uint _bet, bytes32 _salt) {
        if (state == State.Betting) {
            startRevealing();
        }
        require (state == State.Revealing);
        require (_bet != 0);

        Ticket ticket = tickets[_ticket];
        if (ticket.revealedBet != 0) {
            // already revealed
            return;
        }

        bytes32 sealed = sealBetForAddress(_player, _bet, _salt);
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
        // TODO: add some extra threshold to the "now" to avoid miners cheating and closing earlier
        require(state == State.Revealing);
        require(tickets.length -1 == revealedCount || now > revealPeriodEnds );
        uint lowestUniqueBet;
        uint lowestTicket;
        for (uint i = 0; i < uniqueBets.length; i++) {
            uint bet = uniqueBets[i];
            if (lowestUniqueBet == 0 || bet < lowestUniqueBet) {
                uint[] ids = revealedTickets[bet];
                if (ids.length == 1) {
                    lowestUniqueBet = bet;
                    lowestTicket = ids[0];
                }
            }
        }
        if (lowestUniqueBet == 0) {
            state = State.Tied;
        } else {
            state = State.Won;
            winningTicket = lowestTicket;
        }
        owner.transfer(getFeeAmount());
    }

    function payWinner() {
        require(state == State.Won);
        Ticket ticket = tickets[winningTicket];
        require(ticket.deposit > 0);
        ticket.deposit = 0;
        // all money goes to winner
        ticket.player.transfer(getWinnablePotAmount());
    }

    function refund(uint _ticket) {
        require(state == State.Tied);
        Ticket ticket = tickets[_ticket];
        require(ticket.deposit > 0);
        uint value = ticket.deposit - requiredBetAmount * feePt / 1000000;
        ticket.deposit = 0;
        ticket.player.transfer(value);
    }

}
