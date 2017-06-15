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
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];

      self.refreshBalance();
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  refreshBalance: function() {
    var self = this;

    var instance;
    Lupi.deployed().then(function(res) {
      instance = res;
      return web3.eth.getBalance(account);
    }).then(function(value) {
        var balance_element = document.getElementById("balance");
        balance_element.innerHTML = web3.fromWei(value).valueOf();
        document.getElementById("account").innerHTML = account;

        return instance.getRoundInfo();
    }).then( roundRes => {
        var roundInfo = self.parseRoundInfo(roundRes);
        document.getElementById("roundInfo").innerHTML = JSON.stringify(roundInfo,null, 4);
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting balance; see log.");
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
        self.setStatus("Successful guess. Save these to reveal your bet:"
                + "<br> Ticket id: " + ticketId
                + "<br> Guess: " + guess
                + "<br> Secret key: " +  salt
                + "<br> Account: " + account.toString());
        self.refreshBalance();
    }).catch(function(e) {
        console.log(e);
        self.setStatus("Error sending your guess; see log.");
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

            this.setStatus("And now start to reval. Reveal period ends in " + countdown(0, roundInfo.revealPeriodEnds*1000).toString());
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
            winnablePot: result[8],
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
