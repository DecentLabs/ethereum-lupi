// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import lupi_artifacts from '../../build/contracts/Lupi.json'
import { default as secureRandom} from "secure-random/lib/secure-random.js";
var moment = require('moment');
var countdown = require('countdown');

var Lupi = contract(lupi_artifacts);
var accounts;
var account;

window.App = {
  start: function() {
    var self = this;

    Lupi.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        self.setStatus("<font color='red'>There was an error fetching your Ethereum accounts.</red>");
        
        return;
      }

      if (accs.length == 0) {
        self.setStatus("<font color='red'>Couldn't get any accounts! Make sure your Ethereum client is configured correctly.</red>");
        return;
      }

      accounts = accs;
      account = accounts[0];

      self.refreshUI();
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  toggleDebugInfo: function(message) {
    var ele = document.getElementById("massageDiv");
	var text = document.getElementById("toggleDebugInfoText");
	if(ele.style.display == "block") {
    		ele.style.display = "none";
		text.innerHTML = "Show debug info >>";
  	}
	else {
		ele.style.display = "block";
		text.innerHTML = "Hide debug info <<";
	}
  },

  refreshUI: function() {
    var self = this;

    var instance;
    Lupi.deployed().then(function(res) {
      instance = res;
      document.getElementById("contractAddress").innerHTML = instance.address;
      document.getElementById("accountAddress").innerHTML = account;
      return web3.eth.getBalance(account);
    }).then( res => {
        document.getElementById("accountBalance").innerHTML = web3.fromWei(res).valueOf();
        return web3.eth.getBalance(instance.address);
    }).then( res => {
        document.getElementById("contractBalance").innerHTML = web3.fromWei(res).valueOf();
        return instance.getRoundInfo();
    }).then( roundRes => {
        var roundInfo = self.parseRoundInfo(roundRes);
        document.getElementById("winnablePotAmount").innerHTML = web3.fromWei(roundInfo.winnablePotAmount);
        document.getElementById("requiredBetAmount").innerHTML = web3.fromWei(roundInfo.requiredBetAmount);
        document.getElementById("ticketCount").innerHTML = roundInfo.ticketCount;
        document.getElementById("revealedCount").innerHTML = roundInfo.revealedCount;
        document.getElementById("ticketCountLimit1").innerHTML = roundInfo.ticketCountLimit;
        document.getElementById("ticketCountLimit2").innerHTML = roundInfo.ticketCountLimit;
        document.getElementById("revealPeriodLength").innerHTML  = countdown(0, roundInfo.revealPeriodLength*1000).toString();
        document.getElementById("revealPeriodEnds").innerHTML = moment.unix(roundInfo.revealPeriodEnds).format("DD/MMM/YYYY HH:mm:ss");
        document.getElementById("roundInfoDebug").innerHTML = JSON.stringify(roundInfo,null, 4);
        document.getElementById("winningNumber").innerHTML = roundInfo.winningNumber;
        document.getElementById("winningAddress").innerHTML = roundInfo.winningAddress;

        var guessDiv = document.getElementById("guessDiv");
        var revealStartDiv = document.getElementById("revealStartDiv");
        var revealDiv = document.getElementById("revealDiv");
        var revealOverDiv = document.getElementById("revealOverDiv");
        var wonDiv = document.getElementById("wonDiv");
        var tiedDiv = document.getElementById("tiedDiv");

        var guessingOpen = roundInfo.state == 0 && roundInfo.ticketCount < roundInfo.ticketCountLimit ;
        var revealStart = roundInfo.state == 0 && roundInfo.ticketCount == roundInfo.ticketCountLimit;
        var revealOpen = roundInfo.state == 1 && roundInfo.revealedCount < roundInfo.ticketCount;
        var revealOver = roundInfo.state == 1 && (roundInfo.revealedCount == roundInfo.ticketCount ||
               roundInfo.revealPeriodEnds <  Date.now() /1000 );
        guessDiv.style.display =  guessingOpen ? "inline" : "none";
        revealStartDiv.style.display =  revealStart ? "inline" : "none";
        revealDiv.style.display = revealOpen ? "inline" : "none";
        revealOverDiv.style.display = revealOver ? "inline" : "none";
        wonDiv.style.display = roundInfo.state == 2 ? "inline" : "none";
        tiedDiv.style.display =  roundInfo.state == 3 ? "inline" : "none";

        var winnerAlreadyPayedDiv = document.getElementById("winnerAlreadyPayedDiv");
        var payWinnerDiv = document.getElementById("payWinnerDiv");
        if (roundInfo.state == 2  ) {
            instance.tickets(roundInfo.winningTicket)
            .then( res => {
                var deposit = res[1].toNumber();
                winnerAlreadyPayedDiv.style.display = deposit == 0 ? "inline" : "none";
                payWinnerDiv.style.display = deposit > 0 ? "inline" : "none";
            });
        } else {
            winnerAlreadyPayedDiv.style.display =  "none";
            payWinnerDiv.style.display = "none";
        }

    }).catch(function(e) {
      console.log(e);
      self.setStatus("<font color='red'>Error getting balance; see log.</font>");
    });
  },

  placeBet: function() {
    var self = this;

    var guess = parseInt(document.getElementById("guess").value);
    var salt, ticketId, sealedBet;
    var instance, roundInfo;

    this.setStatus("Initiating transaction... (please wait)");

    Lupi.deployed().then(function(res) {
        instance =res;

        return instance.getRoundInfo();
    }).then( roundRes => {
        roundInfo = self.parseRoundInfo(roundRes);
        salt = "0x" + self.toHexString( secureRandom(32, {type: 'Array'}));
        return instance.sealBetForAddress(account.toString(), guess, salt);
    }).then( function(sealRes) {
        sealedBet = sealRes;

        // TODO: var callData = instance.placeBet.getData;
        //var estimatedGas =  web3.eth.estimateGas( {from: account, to: instance.address, data: callData});
        // console.debug("placeBet estimateGas: ", estimateGas);
        var estimateGas = 100000;
        return instance.placeBet(sealedBet, {from: account, value: roundInfo.requiredBetAmount, gas: estimateGas});
    }).then(function( tx) {
        ticketId = tx.logs[0].args.ticketId.toNumber() ;
        self.setStatus("<font color='green'>Successful guess.</font>"
                + "<br> <strong>IMPORTANT:</strong> Save this information to reveal your bet:"
                + "<br> Ticket id: " + ticketId
                + "<br> Guess: " + guess
                + "<br> Secret key: " +  salt
                + "<br> Account: " + account.toString());
        self.refreshUI();
    }).catch(function(e) {
        console.log(e);
        self.setStatus("<font color='red'>Error sending your guess; see log.</red>");
    });
  },

    startRevealing: function() {
        var self = this;
        var instance;

        this.setStatus("Initiating transaction... (please wait)");

        Lupi.deployed()
        .then( res => {
            instance = res;
            return instance.startRevealing({from: account});
        }).then( tx => {
            return instance.getRoundInfo();
        }).then( roundRes => {
            var roundInfo = self.parseRoundInfo(roundRes);
            this.setStatus("<font color='green'>Reveal period started.</green>");
            self.refreshUI();
        }).catch(function(e) {
            console.log(e);
            self.setStatus("<font color='red'>Error while starting to reveal; see log.</font>");
        });
    },

    revealBet: function() {
        var self = this;
        var instance;

        this.setStatus("Initiating transaction... (please wait)");

        Lupi.deployed()
        .then( res => {
            instance = res;
            var ticket = parseInt(document.getElementById("ticketId").value);
            var guess = parseInt(document.getElementById("revealGuess").value);
            var salt = document.getElementById("salt").value;
            var estimateGas = 200000;
            return instance.revealBet(ticket, guess, salt, {from: account, gas: estimateGas});
        }).then( tx => {
            this.setStatus("<font color='green'>Bet revealed</font>" );
            self.refreshUI();
        }).catch(function(e) {
            console.log(e);
            self.setStatus("<font color='red'>Error while revealing your guess; see log.</font>");
        });
    },

    declareWinner: function() {
        var self = this;
        var instance;

        this.setStatus("Initiating transaction... (please wait)");

        Lupi.deployed()
        .then( res => {
            instance = res;
            return instance.declareWinner( {from: account});
        }).then( tx => {
            this.setStatus("<font color='green'>Winner declared</green>" );
            self.refreshUI();
        }).catch(function(e) {
            console.log(e);
            self.setStatus("<font color='red'>Error while declaring winner; see log.</red>");
        });
    },

    payWinner: function() {
        var self = this;
        var instance;

        this.setStatus("Initiating transaction... (please wait)");

        Lupi.deployed()
        .then( res => {
            instance = res;
            return instance.payWinner( {from: account});
        }).then( tx => {
            this.setStatus("<font color='green'>Winner payed</green>" );
            self.refreshUI();
        }).catch(function(e) {
            console.log(e);
            self.setStatus("<font color='red'>Error while paying winner; see log.</font>");
        });
    },

    refund: function() {
        var self = this;
        var instance;

        this.setStatus("Initiating transaction... (please wait)");

        Lupi.deployed()
        .then( res => {
            instance = res;
            var ticketId =  parseInt(document.getElementById("refundTicketId").value);
            return instance.refund( ticketId, {from: account});
        }).then( tx => {
            this.setStatus("<font color='green'>Ticket refunded</font>" );
            self.refreshUI();
        }).catch(function(e) {
            console.log(e);
            self.setStatus("<font color='red'>Error while refunding; see log.</font>");
        });
    },

    parseRoundInfo: function(result) {
        return {
            state: result[0],
            requiredBetAmount: result[1],
            feePt: result[2].toNumber(),
            ticketCountLimit: result[3].toNumber(),
            revealPeriodLength: result[4].toNumber(),
            ticketCount: result[5].toNumber(),
            revealedCount: result[6].toNumber(),
            feeAmount: result[7],
            winnablePotAmount: result[8],
            winningTicket: result[9].toNumber(),
            winningAddress: result[10],
            winningNumber: result[11].toNumber(),
            revealPeriodEnds: result[12].toNumber()
        }
    },

    toHexString: function(byteArray) {
        return byteArray.map(function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('')
    }

};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
