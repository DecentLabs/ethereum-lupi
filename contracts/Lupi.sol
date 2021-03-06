pragma solidity ^0.4.11;

import "./Owned.sol";

contract Lupi is owned {
    // round parameters, set only in constructor
    uint public requiredBetAmount;
    // Betting runs until ticketCountLimit reached or bettingPeriodEnds passed
    // One of ticketCountLimit or bettingPeriodEnds should be set (or both)
    uint public ticketCountLimit; // Betting until x bets placed. 0 if no limit.
    uint public bettingPeriodEnds; // Betting until this time (unix epoch in seconds). 0 if no timeLimit
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

    function Lupi(uint _requiredBetAmount, uint _ticketCountLimit, uint _bettingPeriodLength, uint _revealPeriodLength, uint _feePt ) {
        require(_ticketCountLimit > 0 || _bettingPeriodLength > 0);
        require(_requiredBetAmount * _feePt / 1000000 < _requiredBetAmount);
        requiredBetAmount = _requiredBetAmount;
        ticketCountLimit = _ticketCountLimit;
        revealPeriodLength = _revealPeriodLength;
        if (_bettingPeriodLength == 0) {
            bettingPeriodEnds = 0;
        } else {
            bettingPeriodEnds = _bettingPeriodLength + now;
        }
        feePt = _feePt;
        // ticket zero is reserved
        tickets.length = 1;
    }

    function getRoundInfo() constant returns (
            State _state, uint _requiredBetAmount, uint _feePt, uint _ticketCountLimit, uint _bettingPeriodEnds, uint _revealPeriodLength,
            uint _ticketCount, uint _revealedCount,
            uint _feeAmount,
            uint _guaranteedPotAmount,
            uint _winningTicket,
            address _winningAddress,
            uint _winningNumber,
            uint _revealPeriodEnds) {
        return ( state, requiredBetAmount, feePt, ticketCountLimit, bettingPeriodEnds, revealPeriodLength,
            tickets.length -1, revealedCount,
            getFeeAmount(),
            getGuaranteedPotAmount(),
            winningTicket,
            tickets[winningTicket].player,
            tickets[winningTicket].revealedBet,
            revealPeriodEnds);
    }
    function getTicketCount() returns (uint ret) {
        // needed by LupiManager, check if we could get rid of it:
        //    https://ethereum.stackexchange.com/questions/20812/get-array-length-without-a-getter-from-other-contract
        return tickets.length -1;
    }

    function getFeeAmount() constant returns (uint feeAmount) {
        return (tickets.length - 1) * requiredBetAmount * feePt / 1000000;
    }

    function getGuaranteedPotAmount() constant returns (uint guaranteedPotAmount) {
        if (ticketCountLimit == 0 || bettingPeriodEnds != 0 ) {
            guaranteedPotAmount = getCurrentPotAmount();
        } else {
            guaranteedPotAmount = ticketCountLimit * requiredBetAmount * (1000000 - feePt) / 1000000;
        }
        return guaranteedPotAmount;
    }

    function getCurrentPotAmount() constant returns (uint currentPotAmount) {
        return (tickets.length -1) * requiredBetAmount - getFeeAmount() ;
    }

    function sealBet(uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        return sealBetForAddress(msg.sender, _bet, _salt);
    }

    function sealBetForAddress(address _player, uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        require(_bet != 0);
        return keccak256(_player, _bet, _salt);
    }

    event e_BetPlaced (address indexed player, uint indexed ticketId);
    function placeBet(bytes32 _secretBet) payable returns (uint ticket) {
        require(state == State.Betting);
        require(msg.value == requiredBetAmount);
        require(bettingPeriodEnds > now || bettingPeriodEnds == 0);
        require(tickets.length < ticketCountLimit + 1 || ticketCountLimit == 0);
        ticket = tickets.push(Ticket(msg.sender, msg.value, _secretBet, 0)) - 1;
        e_BetPlaced(msg.sender, ticket);
        if(  ticketCountLimit == tickets.length -1 && ticketCountLimit != 0 ) {
            startRevealing();
        }
        return ticket;
    }

    event e_RevealStarted(uint revealPeriodEnds);
    function startRevealing() {
        require(state == State.Betting );
        require(ticketCountLimit == tickets.length -1 || bettingPeriodEnds <= now);
        state = State.Revealing;
        revealPeriodEnds = now + revealPeriodLength;
        e_RevealStarted(revealPeriodEnds);
    }

    function revealBet(uint _ticket, uint _bet, bytes32 _salt) {
        revealBetForAddress(msg.sender, _ticket, _bet, _salt);
    }

    // IDEA incentivize reveals with paying back a reserve
    event e_BetRevealed(address indexed player, uint indexed ticketId, uint bet);
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
        e_BetRevealed(_player, _ticket, _bet);
    }

    // IDEA make this iterative, so it scales indefinitely
    event e_WinnerDeclared(address winnerAddress, uint winningTicket, uint winningNumber);
    function declareWinner() {
        // TODO: add some extra threshold to the "now" to avoid miners cheating and closing earlier
        require(state == State.Revealing);
        require(tickets.length -1 == revealedCount || now >= revealPeriodEnds );
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
        e_WinnerDeclared( tickets[winningTicket].player, winningTicket, tickets[winningTicket].revealedBet);
    }

    function payWinner() {
        require(state == State.Won);
        Ticket ticket = tickets[winningTicket];
        require(ticket.deposit > 0);
        ticket.deposit = 0;
        // all money goes to winner
        ticket.player.transfer(getCurrentPotAmount());
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
