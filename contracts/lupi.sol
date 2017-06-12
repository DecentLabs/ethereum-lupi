pragma solidity ^0.4.11;

contract lupi {

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
    uint[] revealedBets;

    uint winningTicket;

    function lupi() {
        // ticket zero is reserved
        tickets.push(Ticket(0, 0, 0, 0));
    }

    function sealBet(uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        return sealBet(msg.sender, _bet, _salt);
    }

    function sealBet(address _player, uint _bet, bytes32 _salt) constant returns (bytes32 sealedBet) {
        require (_bet != 0);
        return keccak256(_player, _bet, _salt);
    }

    function placeBet(bytes32 _secretBet) payable returns (uint ticket) {
        require (state == State.Betting);
        return tickets.push(Ticket(msg.sender, msg.value, _secretBet, 0)) - 1;
    }

    function bettingOver() {
        require (state == State.Betting);
        // TODO assert current time is after betting period
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
            revealedBets.push(_bet);
        }
        ids.push(_ticket);

        revealedCount++;
    }

    // IDEA make this iterative, so it scales indefinitely
    function declareWinner() {
        // TODO assert current time is after reveal period
        require (state == State.Revealing);
        state = State.Closed;
        uint lowestBet;
        uint lowestTicket;
        for (uint i = 0; i < revealedBets.length; i++) {
            uint bet = revealedBets[i];
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
