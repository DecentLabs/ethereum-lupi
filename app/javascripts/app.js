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
var FileSaver = require('file-saver');
var Parse = require('parse');

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
    }, // window.start

    setStatus: function(message) {
        var status = document.getElementById("status");
        status.innerHTML = "<br>" + message;
    },

    toggleSubscribeAlert: function(message) {
        var ele = document.getElementById("subscribeAlertDiv");
        var text = document.getElementById("subscribeAlertText");
        if(ele.style.display == "block") {
        		ele.style.display = "none";
        	text.innerHTML = "Get notified when you need to reveal >>";
        	}
        else {
        	ele.style.display = "block";
        	text.innerHTML = "Hide subscribe form <<";
        }
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

    toggleManualReveal: function(message) {
        var ele = document.getElementById("revealManualDiv");
        var text = document.getElementById("toggleManualRevealText");
        if(ele.style.display == "block") {
              ele.style.display = "none";
              text.innerHTML = "Type in ticket info >>";
          }
        else {
          ele.style.display = "block";
          text.innerHTML = "Hide manual ticket reveal fields <<";
        }
    },

    refreshUI: function() {
        var self = this;
        if (typeof(Storage) !== "undefined" && localStorage.length > 0) {
            document.getElementById("backupDiv").style.display = "block";
        }
        document.getElementById("accountAddress").innerHTML = account;
        if ( document.getElementById("accountInput").value == "" ) {
            document.getElementById("accountInput").value = account;
        }
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
            var roundInfo = new App.RoundInfo(roundRes);
            document.getElementById("winnablePotAmount").innerHTML = web3.fromWei(roundInfo.winnablePotAmount);
            document.getElementById("requiredBetAmount").innerHTML = web3.fromWei(roundInfo.requiredBetAmount);
            document.getElementById("ticketCount").innerHTML = roundInfo.ticketCount;
            document.getElementById("revealedCount").innerHTML = roundInfo.revealedCount;
            document.getElementById("unRevealedCount").innerHTML = roundInfo.ticketCount - roundInfo.revealedCount;
            document.getElementById("ticketCountLimit1").innerHTML = roundInfo.ticketCountLimit;
            document.getElementById("ticketCountLimit2").innerHTML = roundInfo.ticketCountLimit;

            document.getElementById("revealPeriodLength1").innerHTML  = countdown(0, roundInfo.revealPeriodLength*1000).toString();
            document.getElementById("revealPeriodLength2").innerHTML  = countdown(0, roundInfo.revealPeriodLength*1000).toString();
            document.getElementById("revealPeriodEnds").innerHTML = moment.unix(roundInfo.revealPeriodEnds).format("DD/MMM/YYYY HH:mm:ss");
            document.getElementById("roundInfoDebug").innerHTML = JSON.stringify(roundInfo,null, 4);
            document.getElementById("winningNumber").innerHTML = roundInfo.winningNumber;
            document.getElementById("winningAddress").innerHTML = roundInfo.winningAddress;

            var guessDiv = document.getElementById("guessDiv");

            var revealDiv = document.getElementById("revealDiv");
            var revealFirstDiv = document.getElementById("revealFirstDiv");
            var revealRunningDiv = document.getElementById("revealRunningDiv");
            var revealStartOnlyDiv = document.getElementById("revealStartOnlyDiv");
            var revealOverDiv = document.getElementById("revealOverDiv");
            var revealOverAllRevealedDiv = document.getElementById("revealOverAllRevealedDiv");
            var wonDiv = document.getElementById("wonDiv");
            var tiedDiv = document.getElementById("tiedDiv");

            var guessingOpen = roundInfo.state == 0 && roundInfo.ticketCount < roundInfo.ticketCountLimit ;
            var revealStart = roundInfo.state == 0 && roundInfo.ticketCount == roundInfo.ticketCountLimit;
            var revealRunning = roundInfo.state == 1 && roundInfo.revealedCount < roundInfo.ticketCount;
            var revealOverNotAllRevealed = roundInfo.state == 1 && roundInfo.revealedCount !== roundInfo.ticketCount &&
                   roundInfo.revealPeriodEnds <  Date.now() /1000 ;
            var revealOverAllRevealed = roundInfo.state == 1 && roundInfo.revealedCount == roundInfo.ticketCount;
            guessDiv.style.display =  guessingOpen ? "inline" : "none";

            revealFirstDiv.style.display =  revealStart ? "inline" : "none";
            revealRunningDiv.style.display =  revealRunning ? "inline" : "none";
            revealDiv.style.display =  revealStart || revealRunning ? "inline" : "none";

            if( revealStart || revealRunning ) {
                var ticketsListDiv = document.getElementById("ticketsListDiv");
                while (ticketsListDiv.hasChildNodes()) {
                    ticketsListDiv.removeChild(ticketsListDiv.lastChild);
                }
                var tickets = JSON.parse( localStorage.getItem(gameInstance.address));
                if ( tickets != null ) {
                    var revealedNode = document.createElement("div");
                    revealedNode.id = "revealedTicketsListDiv";
                    var revealNode = document.createElement("div");
                    revealNode.id = "revealTicketButtonsDiv";
                    var buttonNode;
                    for (var i=0; i < tickets.length; i++) {
                        if (tickets[i].isRevealed) {
                            //revealedNode.appendChild( document.createElement("br"));
                            revealedNode.appendChild(  document.createTextNode("TicketId: " + tickets[i].ticketId
                                + ", guess: " + tickets[i].guess + " | ") );
                        } else {
                            buttonNode = document.createElement("button");
                            buttonNode.id = "revealButton" + i;
                            buttonNode.value = "Reveal ticket " + tickets[i].ticketId;
                            buttonNode.ticket = tickets[i];
                            buttonNode.appendChild(document.createTextNode(buttonNode.value));

                            buttonNode.addEventListener('click', function(){
                                App.revealBet(gameInstance.address, this.ticket);
                            });
                            revealNode.appendChild(buttonNode);
                        }
                    } // for each ticket in store
                    ticketsListDiv.appendChild(revealNode);
                    ticketsListDiv.appendChild(document.createElement("br"));
                    ticketsListDiv.appendChild(document.createTextNode("Tickets you already revealed:"));
                    ticketsListDiv.appendChild(revealedNode);
                }
            }
            revealStartOnlyDiv.style.display = revealStart ? "inline" : "none";

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
        var gasEstimate;
        self.setStatus("Initiating transaction... (please wait)");
        var guess = parseInt(document.getElementById("guess").value);
        var salt, ticketId, sealedBet;
        var roundInfo;
        // TODO: do disable for all submit not only for bets + add spinner/info to sign + do it nicer
        var placeBetButton = document.getElementById("placeBetButton"); //
        placeBetButton.disabled = true;

        gameInstance.getRoundInfo()
        .then( roundRes => {
            roundInfo = new App.RoundInfo(roundRes);
            salt = "0x" + self.toHexString( secureRandom(32, {type: 'Array'}));
            return gameInstance.sealBetForAddress(account.toString(), guess, salt);
        }).then( function(sealRes) {
            sealedBet = sealRes;
            web3.eth.estimateGas( {from: account, data: gameInstance.placeBet.getData}, function(error, res ) {
                gasEstimate = res + 50000;
                gameInstance.placeBet(sealedBet, {from: account, value: roundInfo.requiredBetAmount, gas: gasEstimate})
                .then(function( tx) {
                    if( tx.receipt.gasUsed == gasEstimate) {
                        throw("placeBet error, all gas used: " + tx.receipt.gasUsed);
                    }
                    ticketId = tx.logs[0].args.ticketId.toNumber() ;
                    var status = "<font color='green'>Successful guess.";
                    try {
                        var ticket = new App.Ticket(ticketId, guess, salt, account, false);
                        var ticketStore;
                        ticketStore = JSON.parse( localStorage.getItem(gameInstance.address));
                        if (ticketStore == null ) {
                            ticketStore = new Array();
                        }
                        ticketStore.push(ticket);
                        localStorage.setItem(gameInstance.address, JSON.stringify(ticketStore));

                        status += "<br><strong>1. IMPORTANT: </strong>"
                                + "<a href='#self' onclick='App.exportTickets(); return false;'>"
                                + "Download your tickets " + "</a> for backup."
                    }
                    catch( error) {
                        status += "<br> Couldn't save your secret key locally. "
                                + "<br> <strong>1. IMPORTANT:</strong> Save this information to be able to reveal your bet:"
                                + "<br> Ticket id: " + ticketId
                                + "<br> Guess: " + guess
                                + "<br> Secret key: " +  salt
                                + "<br> Account: " + account.toString();
                        console.error("Placebet() save to localstorage", error);
                        placeBetButton.disabled = false;
                    }
                    status += "<br><strong>2. Subscribe for notifications </strong> below to know when you need to reveal your ticket</font>";
                    self.setStatus(status);
                    self.refreshUI();
                    placeBetButton.disabled = false;
                }).catch(function(e) {
                    console.error("placeBet() error", e);
                    self.setStatus("<font color='red'>Error sending your guess; see log.</red>");
                    placeBetButton.disabled = false;
                }); // placeBet()
            }); // estimateGas()
        }).catch( e => {
            console.error("App.placeBet error", e);
            self.setStatus("<font color='red'>Error sending your guess; see log.</red>");
            placeBetButton.disabled = false;
        }); // getRoundInfo()

    }, // placeBet()

    exportTickets: function() {
        var toSave = [JSON.stringify(localStorage, null, 2)];
        var toSaveBlob = new Blob(toSave, {type: "data:application/json"})
        FileSaver.saveAs(toSaveBlob, "TicketBackup"
            + moment().format("YYYYMMDDHHmmss")
            + ".json");
    }, // downloadTickets

    subscribeAlert: function() {
        var self = this;
        self.setStatus("Initiating transaction... (please wait)");
        var email =  document.getElementById("emailInput").value;
        Parse.initialize("CHytB89n9X0rzg3agIPt5QyWb2yTKv3oSf1Z3PQ2", "QNEEQJ0tCpgMbyWrtwErZC2Ck31gPRV3mng9sHxl");
        Parse.serverURL = 'https://parseapi.back4app.com';
        var Subscription = Parse.Object.extend("Subscription");
        var subscription = new Subscription();

        subscription.set("email", email);
        subscription.set("gameAddress", gameInstance.address);

        subscription.save(null, {
          success: function(subscription) {
            self.setStatus("<font color='green'>Successful subscription for " + email + "</font>");
          },
          error: function(subscription, error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            console.error('subscribeAlert() error:', error);
            self.setStatus("<font color='red'>Can't save subscription. " + error.message + "</font> ");
          }
        });

    },

    importTickets: function(filePath) {
        var self = this;
        var output = "", reader;

        if (window.File && window.FileReader && window.FileList && window.Blob) {
            reader = new FileReader();
        } else {
            alert('');
            self.setStatus("<font color='red'>Can't restore tickets: the File APIs are not fully supported by your browser."
                + "<br>Try again with an up to date browser or reveal your tickets by entering ticket info manually.</font> ");
            return false;
        }

        if(filePath.files && filePath.files[0]) {
            reader.onload = function (e) {
                output = e.target.result;
                App.addImportedTickets(output);
            };//end onload()
            reader.readAsText(filePath.files[0]);
        }//end if html5 filelist support
        else if(ActiveXObject && filePath) { //fallback to IE 6-8 support via ActiveX
            try {
                reader = new ActiveXObject("Scripting.FileSystemObject");
                var file = reader.OpenTextFile(filePath, 1); //ActiveX File Object
                output = file.ReadAll(); //text contents of file
                file.Close(); //close file "input stream"
                App.addImportedTickets(output);
            } catch (e) {
                if (e.number == -2146827859) {
                    alert('Unable to access local files due to browser security settings. ' +
                     'To overcome this, go to Tools->Internet Options->Security->Custom Level. ' +
                     'Find the setting for "Initialize and script ActiveX controls not marked as safe" and change it to "Enable" or "Prompt"');
                }
            }
        }
        else { //this is where you could fallback to Java Applet, Flash or similar
            return false;
        }
        self.setStatus("<font color='green'>Successful ticket import from "
                + filePath.files[0].name + "</green>");
        filePath.value = "";
        App.refreshUI();
        return true;
    }, // importTickets

    addImportedTickets: function (content) {
        var data = JSON.parse(content);
        Object.keys(data).forEach(function (k) {
          localStorage.setItem(k, data[k]);
        });
    }, // addImportedTickets

    startRevealing: function() {
        var self = this;
        var gasEstimate;
        self.setStatus("Initiating transaction... (please wait)");

        web3.eth.estimateGas( {from: account, data: gameInstance.startRevealing.getData }, function(error, res) {
            gasEstimate = res + 10000;
            gameInstance.startRevealing({from: account, gas: gasEstimate})
            .then( tx => {
                if( tx.receipt.gasUsed == gasEstimate) {
                    throw("startRevealing error, all gas used: " + tx.receipt.gasUsed);
                }
                return gameInstance.getRoundInfo();
            }).then( roundRes => {
                var roundInfo = new App.RoundInfo(roundRes);
                self.setStatus("<font color='green'>Reveal period started.</green>");
                self.refreshUI();
            }).catch(function(e) {
                console.error("startRevealing() error", e);
                self.setStatus("<font color='red'>Error while starting to reveal; see log.</font>");
            }); // startRevealing()
        }); // estimateGas()
    },

    manualRevealBet: function() {
        var self = this;
        var accountInput = document.getElementById("accountInput").value;
        var ticketId = parseInt(document.getElementById("ticketId").value);
        var guess = parseInt(document.getElementById("revealGuess").value);
        var salt = document.getElementById("salt").value;
        var ticket = new App.Ticket(ticketId, guess, salt, accountInput);

        App.revealBet(gameInstance.address, ticket);
    },

    revealBet: function( gameAddress, ticket) {
        var self = this;
        var gasEstimate;
        self.setStatus("Initiating transaction... (please wait)");
        // TODO: first reveal ca. 167000 then 11700 or 770000 ...
        web3.eth.estimateGas( {from: account, data: gameInstance.revealBet.getData }, function( error, res) {
            gasEstimate = res + 140000;
            gameInstance.revealBetForAddress(ticket.account, ticket.ticketId, ticket.guess, ticket.salt, {from: account, gas: gasEstimate})
            .then( tx => {
                if( tx.receipt.gasUsed == gasEstimate) {
                    throw("revealBetForAddress error, all gas used: " + tx.receipt.gasUsed);
                }
                // Successful reveal, update localeStorage
                ticket.isRevealed = true;
                var ticketStore;
                ticketStore = JSON.parse( localStorage.getItem(gameInstance.address));
                if (ticketStore == null ) {
                    ticketStore = new Array();
                    ticketStore.push(ticket);
                } else {
                    var t = ticketStore.find(x => x.ticketId === ticket.ticketId);
                    if (typeof t == "undefined" ) {
                        ticketStore.push(ticket);
                    } else {
                        var index = ticketStore.indexOf(t);
                        ticketStore[index] = ticket;
                    }
                }
                localStorage.setItem(gameInstance.address, JSON.stringify(ticketStore));
                self.setStatus("<font color='green'>Bet revealed</font>" );
                self.refreshUI();
            }).catch(function(e) {
                console.error("revealBet() error", e);
                self.setStatus("<font color='red'>Error while revealing your guess; see log.</font>");
            }); // revealBet ()
        }); // estimateGas()
    }, // revealBet()

    declareWinner: function() {
        var self = this;
        var gasEstimate;
        var roundInfo;
        self.setStatus("Initiating transaction... (please wait)");

        gameInstance.getRoundInfo()
        .then( res => {
            roundInfo = new App.RoundInfo(res);
            web3.eth.estimateGas( {from: account, data: gameInstance.declareWinner.getData }, function(error, res) {
                gasEstimate =  res + 10000 + roundInfo.ticketCountLimit * 1000;
                gameInstance.declareWinner({from: account, gas: gasEstimate})
                .then( tx => {
                    if( tx.receipt.gasUsed == gasEstimate) {
                        throw("declareWinner error, all gas used: " + tx.receipt.gasUsed);
                    }
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
        var gasEstimate;
        self.setStatus("Initiating transaction... (please wait)");

        web3.eth.estimateGas( {from: account, data: gameInstance.payWinner.getData }, function(error, res) {
            gasEstimate = res + 10000;
            gameInstance.payWinner( {from: account, gas: gasEstimate})
            .then( tx => {
                if( tx.receipt.gasUsed == gasEstimate) {
                    throw("payWinner error, all gas used: " + tx.receipt.gasUsed);
                }
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
        var gasEstimate;
        self.setStatus("Initiating transaction... (please wait)");
        var ticketId =  parseInt(document.getElementById("refundTicketId").value);

        web3.eth.estimateGas( {from: account, data: gameInstance.refund.getData }, function(error, res) {
            gasEstimate = res + 10000;
            gameInstance.refund( ticketId, {from: account, gas: gasEstimate})
            .then( tx => {
                if( tx.receipt.gasUsed == gasEstimate) {
                    throw("refund error, all gas used: " + tx.receipt.gasUsed);
                }
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
        var gasEstimate;
        self.setStatus("Initiating transaction... (please wait)");
        var requiredBetAmount = web3.toWei( document.getElementById("requiredBetAmountInput").value, "ether" );
        var ticketCountLimit = parseInt(document.getElementById("ticketCountLimitInput").value);
        var revealPeriodLength = parseInt(document.getElementById("revealPeriodLengthInput").value) * 60;
        var feePt = document.getElementById("feePtInput").value * 10000;

        //web3.eth.estimateGas( {from: account, data: lupiManagerInstance.createGame.getData }) + 10000;
        gasEstimate = 1200000;
        lupiManagerInstance.createGame(requiredBetAmount, ticketCountLimit, revealPeriodLength, feePt,
                 {from: account, gas: gasEstimate})
        .then( tx => {
            if( tx.receipt.gasUsed == gasEstimate) {
                throw("createGame error, all gas used: " + tx.receipt.gasUsed);
            }
            self.setStatus("<font color='green'>Game created. Idx: " + tx.logs[2].args.gameIdx
            + " address: " + tx.logs[1].args.gameAddress + " </font>" );
            self.refreshUI();
        }).catch(function(e) {
            console.error("createGame() error", e);
            self.setStatus("<font color='red'>Error while creating game; see log.</font>");
        });
    },

    Ticket: function(ticketId, guess, salt, account, isRevealed) {
        this.ticketId = ticketId;
        this.guess = guess;
        this.salt = salt;
        this.account = account;
        this.isRevealed = isRevealed;
    }, // Ticket()

    RoundInfo: function(result) {
        this.state = result[0];
        this.requiredBetAmount = result[1];
        this.feePt = result[2].toNumber();
        this.ticketCountLimit = result[3].toNumber();
        this.revealPeriodLength = result[4].toNumber();
        this.ticketCount = result[5].toNumber();
        this.revealedCount = result[6].toNumber();
        this.feeAmount = result[7];
        this.winnablePotAmount = result[8];
        this.currentPotAmount = result[9];
        this.winningTicket = result[10].toNumber();
        this.winningAddress = result[11];
        this.winningNumber = result[12].toNumber();
        this.revealPeriodEnds = result[13].toNumber();
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
