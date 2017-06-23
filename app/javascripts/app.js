// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';

import lupi_artifacts from '../../build/contracts/Lupi.json';
import lupiManager_artifacts from '../../build/contracts/LupiManager.json';
import { default as secureRandom} from "secure-random/lib/secure-random.js";
var moment = require('moment');
var countdown = require('countdown');

var Lupi = contract(lupi_artifacts);
var lupiManager = contract(lupiManager_artifacts);
var accounts, account;
var gameInstance, lupiManagerInstance;

// TODO: add accountchange event to do refreshUI (for Metamask users)
window.App = {
  start: function() {
    var self = this;

    lupiManager.setProvider(web3.currentProvider);
    Lupi.setProvider(web3.currentProvider);

    web3.eth.getAccounts(function(err, accs) {
        if (err != null) {
            self.setStatus("<font color='red'>There was an error fetching your Ethereum accounts.</red>");
            console.error("Error getting account list: ", err);
            document.getElementById("connectHelpDiv").style.display = "block";
            return;
        }

        if (accs.length == 0) {
            self.setStatus("<font color='red'>Couldn't get any accounts! Make sure your Ethereum client is configured correctly.</red>");
            console.error("Received no account in account list");
            document.getElementById("connectHelpDiv").style.display = "block";
            return;
        }

        accounts = accs;
        account = accounts[0];

        lupiManager.deployed()
        .then( res => {
            lupiManagerInstance = res;
            return lupiManagerInstance.owner();
        }).then( res => {
            console.log(typeof res, JSON.stringify(res));
            if (res ==  "0x" ) {
                throw("lupiManager at " + lupiManager.address + " returned 0x owner() - not deployed?");
            }
            self.refreshUI();
        }).catch( error => {
            console.error("failed to connect LupiManager or Lupi", error);
            App.setStatus("<font color='red'>Can't find any game on Ethereum network. Are you on testnet?</font>");
            document.getElementById("connectHelpDiv").style.display = "block";
        }); // lupiManager.deployed()
    }); // getAccounts
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
    document.getElementById("accountAddress").innerHTML = account;
    document.getElementById("lupiManagerAddress").innerHTML = lupiManagerInstance.address;

    web3.eth.getBalance(account, function(error, res) {
        if (error) {
            self.setStatus("<font color='red'>Error getting account balance; see log.</font>");
            console.error("refreshUI().getBalance(account) error", error);
        } else {
            document.getElementById("accountBalance").innerHTML = web3.fromWei(res).valueOf();
        }
    }); // getBalance(account)

    lupiManagerInstance.getGamesCount()
    .then( res => {
        // TODO: handle if no games or game address is 0x (same way as on App.start)
        var gamesCount = res.toNumber();
        var gameIdx = gamesCount - 1;
        document.getElementById("gameIdx").innerHTML = gameIdx;
        document.getElementById("gamesCount").innerHTML = gamesCount;

        return lupiManagerInstance.games(gameIdx);
    }).then( res => {
        gameInstance = Lupi.at(res);
        document.getElementById("contractAddress").innerHTML = gameInstance.address;

        return lupiManagerInstance.owner();
    }).then( lupiManagerInstanceOwner => {
        document.getElementById("lupiManagerOwner").innerHTML = lupiManagerInstanceOwner;

        return gameInstance.owner();
    }).then( gameInstanceOwner => {
        document.getElementById("contractOwner").innerHTML = gameInstanceOwner;

        web3.eth.getBalance(gameInstance.address, function(error, res) {
            if (error) {
                self.setStatus("<font color='red'>Error getting contract balance; see log.</font>");
                console.error("refreshUI().getBalance(gameInstance.address) error", error);
            } else {
                document.getElementById("contractBalance").innerHTML = web3.fromWei(res).valueOf();
            }
        }); // getBalance(gameInstance)

        return gameInstance.getRoundInfo();
    }).then( roundRes => {
        var roundInfo = self.parseRoundInfo(roundRes);
        document.getElementById("winnablePotAmount").innerHTML = web3.fromWei(roundInfo.winnablePotAmount);
        document.getElementById("requiredBetAmount").innerHTML = web3.fromWei(roundInfo.requiredBetAmount);
        document.getElementById("ticketCount").innerHTML = roundInfo.ticketCount;
        document.getElementById("revealedCount").innerHTML = roundInfo.revealedCount;
        document.getElementById("unRevealedCount").innerHTML = roundInfo.ticketCount - roundInfo.revealedCount;
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
        var revealOverAllRevealedDiv = document.getElementById("revealOverAllRevealedDiv");
        var wonDiv = document.getElementById("wonDiv");
        var tiedDiv = document.getElementById("tiedDiv");

        var guessingOpen = roundInfo.state == 0 && roundInfo.ticketCount < roundInfo.ticketCountLimit ;
        var revealStart = roundInfo.state == 0 && roundInfo.ticketCount == roundInfo.ticketCountLimit;
        var revealOpen = roundInfo.state == 1 && roundInfo.revealedCount < roundInfo.ticketCount;
        var revealOverNotAllRevealed = roundInfo.state == 1 && roundInfo.revealedCount !== roundInfo.ticketCount &&
               roundInfo.revealPeriodEnds <  Date.now() /1000 ;
        var revealOverAllRevealed = roundInfo.state == 1 && roundInfo.revealedCount == roundInfo.ticketCount;
        guessDiv.style.display =  guessingOpen ? "inline" : "none";
        revealStartDiv.style.display =  revealStart ? "inline" : "none";
        revealDiv.style.display = revealOpen ? "inline" : "none";
        revealOverDiv.style.display = revealOverNotAllRevealed ? "inline" : "none";
        revealOverAllRevealedDiv.style.display = revealOverAllRevealed ? "inline" : "none";
        wonDiv.style.display = roundInfo.state == 2 ? "inline" : "none";
        tiedDiv.style.display =  roundInfo.state == 3 ? "inline" : "none";

        var winnerAlreadyPayedDiv = document.getElementById("winnerAlreadyPayedDiv");
        var payWinnerDiv = document.getElementById("payWinnerDiv");
        if (roundInfo.state == 2  ) {
            gameInstance.tickets(roundInfo.winningTicket)
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
      console.error("refreshUI() error", e);
      self.setStatus("<font color='red'>Error updating data; see log.</font>");
    });
  },

  placeBet: function() {
    var self = this;
    self.setStatus("Initiating transaction... (please wait)");
    var guess = parseInt(document.getElementById("guess").value);
    var salt, ticketId, sealedBet;
    var roundInfo;

    gameInstance.getRoundInfo()
    .then( roundRes => {
        console.log("gameInstance.address", gameInstance.address);
        roundInfo = self.parseRoundInfo(roundRes);
        salt = "0x" + self.toHexString( secureRandom(32, {type: 'Array'}));
        return gameInstance.sealBetForAddress(account.toString(), guess, salt);
    }).then( function(sealRes) {
        sealedBet = sealRes;
        web3.eth.estimateGas( {from: account, data: gameInstance.placeBet.getData}, function(error, res ) {
            var gasEstimate = res + 50000;
            gameInstance.placeBet(sealedBet, {from: account, value: roundInfo.requiredBetAmount, gas: gasEstimate})
            .then(function( tx) {
                ticketId = tx.logs[0].args.ticketId.toNumber() ;
                self.setStatus("<font color='green'>Successful guess.</font>"
                        + "<br> <strong>IMPORTANT:</strong> Save this information to reveal your bet:"
                        + "<br> Ticket id: " + ticketId
                        + "<br> Guess: " + guess
                        + "<br> Secret key: " +  salt
                        + "<br> Account: " + account.toString());
                self.refreshUI();
            }).catch(function(e) {
                console.error("placeBet() error", e);
                self.setStatus("<font color='red'>Error sending your guess; see log.</red>");
            }); // placeBet()
        }); // estimateGas()
    }).catch( e => {
        console.error("App.placeBet error", e);
        self.setStatus("<font color='red'>Error sending your guess; see log.</red>");
    }); // getRoundInfo()

  },

    startRevealing: function() {
        var self = this;
        self.setStatus("Initiating transaction... (please wait)");

        web3.eth.estimateGas( {from: account, data: gameInstance.startRevealing.getData }, function(error, res) {
            var gasEstimate = res + 10000;
            gameInstance.startRevealing({from: account, gas: gasEstimate})
            .then( tx => {
                return gameInstance.getRoundInfo();
            }).then( roundRes => {
                var roundInfo = self.parseRoundInfo(roundRes);
                self.setStatus("<font color='green'>Reveal period started.</green>");
                self.refreshUI();
            }).catch(function(e) {
                console.error("startRevealing() error", e);
                self.setStatus("<font color='red'>Error while starting to reveal; see log.</font>");
            }); // startRevealing()
        }); // estimateGas()
    },

    revealBet: function() {
        var self = this;
        self.setStatus("Initiating transaction... (please wait)");
        var ticket = parseInt(document.getElementById("ticketId").value);
        var guess = parseInt(document.getElementById("revealGuess").value);
        var salt = document.getElementById("salt").value;

        // TODO: first reveal ca. 167000 then 11700 or 770000 ...
        web3.eth.estimateGas( {from: account, data: gameInstance.revealBet.getData }, function( error, res) {
            var gasEstimate = res + 120000;
            gameInstance.revealBet(ticket, guess, salt, {from: account, gas: gasEstimate})
            .then( tx => {
                self.setStatus("<font color='green'>Bet revealed</font>" );
                self.refreshUI();
            }).catch(function(e) {
                console.error("revealBet() error", e);
                self.setStatus("<font color='red'>Error while revealing your guess; see log.</font>");
            }); // revealBet ()
        }); // estimateGas()
    },

    declareWinner: function() {
        var self = this;
        var roundInfo;
        self.setStatus("Initiating transaction... (please wait)");

        gameInstance.getRoundInfo()
        .then( res => {
            roundInfo = App.parseRoundInfo(res);
            web3.eth.estimateGas( {from: account, data: gameInstance.declareWinner.getData }, function(error, res) {
                var gasEstimate =  res + 10000 + roundInfo.ticketCountLimit * 1000;
                // FIXME: declareWinner() throws on testrpc when game created with createGame():
                //     Error: VM Exception while processing transaction: invalid opcode
                console.debug("gameInstance.address:", gameInstance.address);
                console.debug("getRoundInfo():", JSON.stringify(roundInfo, null, 4));
                var timeNow = Math.floor(Date.now() / 1000);
                console.debug("timeNow:", timeNow, "revealPeriodLength:", roundInfo.revealPeriodLength,
                    "revealPeriodEnds:", roundInfo.revealPeriodEnds, "now-ends:", timeNow - roundInfo.revealPeriodEnds );
                console.debug("from account:", account, "gasEstimate:", gasEstimate);
                gameInstance.declareWinner({from: account, gas: gasEstimate})
                .then( tx => {
                    self.setStatus("<font color='green'>Winner declared</green>" );
                    self.refreshUI();
                }).catch(function(e) {
                    console.error("declareWinner() error", e);
                    self.setStatus("<font color='red'>Error while declaring winner; see log.</red>");
                }); // declareWinner()
            }); // estimateGas()
        }); // getRoundInfo()
    },

    payWinner: function() {
        var self = this;
        self.setStatus("Initiating transaction... (please wait)");

        web3.eth.estimateGas( {from: account, data: gameInstance.payWinner.getData }, function(error, res) {
            var gasEstimate = res + 10000;
            gameInstance.payWinner( {from: account, gas: gasEstimate})
            .then( tx => {
                self.setStatus("<font color='green'>Winner payed</green>" );
                self.refreshUI();
            }).catch(function(e) {
                console.error("payWinner() error", e);
                self.setStatus("<font color='red'>Error while paying winner; see log.</font>");
            }); // payWinner()
        }); // estimateGas()
    },

    refund: function() {
        var self = this;
        self.setStatus("Initiating transaction... (please wait)");
        var ticketId =  parseInt(document.getElementById("refundTicketId").value);

        web3.eth.estimateGas( {from: account, data: gameInstance.refund.getData }, function(error, res) {
            var gasEstimate = res + 10000;
            gameInstance.refund( ticketId, {from: account, gas: gasEstimate})
            .then( tx => {
                self.setStatus("<font color='green'>Ticket refunded</font>" );
                self.refreshUI();
            }).catch(function(e) {
                console.error("refund() error", e);
                self.setStatus("<font color='red'>Error while refunding; see log.</font>");
            }); // refund()
        }); // estimateGas()
    },

    createGame: function() {
        var self = this;

        self.setStatus("Initiating transaction... (please wait)");
        var requiredBetAmount = web3.toWei( document.getElementById("requiredBetAmountInput").value, "ether" );
        var ticketCountLimit = parseInt(document.getElementById("ticketCountLimitInput").value);
        var revealPeriodLength = parseInt(document.getElementById("revealPeriodLengthInput").value) * 60;
        var feePt = document.getElementById("feePtInput").value * 10000;

        //web3.eth.estimateGas( {from: account, data: lupiManagerInstance.createGame.getData }) + 10000;
        var gasEstimate = 1200000;
        console.log("createGame() requiredBetAmount:", requiredBetAmount,
         "ticketCountLimit:", ticketCountLimit, "revealPeriodLength:", revealPeriodLength, "feePt:", feePt);
        lupiManagerInstance.createGame(requiredBetAmount, ticketCountLimit, revealPeriodLength, feePt,
                 {from: account, gas: gasEstimate})
        .then( tx => {
            self.setStatus("<font color='green'>Game created. Idx: " + tx.logs[2].args.gameIdx
            + " address: " + tx.logs[1].args.gameAddress + " </font>" );
            self.refreshUI();
        }).catch(function(e) {
            console.error("createGame() error", e);
            self.setStatus("<font color='red'>Error while creating game; see log.</font>");
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
            currentPotAmount: result[9],
            winningTicket: result[10].toNumber(),
            winningAddress: result[11],
            winningNumber: result[12].toNumber(),
            revealPeriodEnds: result[13].toNumber()
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
