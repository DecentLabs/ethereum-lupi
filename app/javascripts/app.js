// Import the page's CSS. Webpack will know what to do with it.
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-material-design/dist/css/bootstrap-material-design.css';
import 'bootstrap-material-design/dist/css/ripples.css';
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
var LupiHelper = require('../javascripts/LupiHelper.js');
var lupiManagerHelper = require('../javascripts/LupiManagerHelper.js');

var $ = window.$ = require('jquery');
require('bootstrap');
require('bootstrap-material-design/dist/js/material.js');
require('bootstrap-material-design/dist/js/ripples.js');

var Lupi = contract(lupi_artifacts);
var lupiManager = contract(lupiManager_artifacts);
var accounts, account;
var gameInstance, lupiManagerInstance;

// TODO: add accountchange event to do refreshUI (for Metamask users)
window.App = {
    start: function() {
        var self = this, lupiManagerOwner;
        return new Promise( async function (resolve, reject)  {
            lupiManager.setProvider(web3.currentProvider);
            Lupi.setProvider(web3.currentProvider);

            web3.eth.getAccounts(async function(err, accs) {
                if (err != null) {
                    self.setStatus('danger', "There was an error fetching your Ethereum accounts.");
                    console.error("Error getting account list: ", err);
                    document.getElementById("loadingDiv").style.display = "none";
                    document.getElementById("connectHelpDiv").style.display = "block";
                    reject(error) ;
                }

                if (accs.length == 0) {
                    self.setStatus('danger', "Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
                    console.error("Received no account in account list");
                    document.getElementById("loadingDiv").style.display = "none";
                    document.getElementById("connectHelpDiv").style.display = "block";
                    reject(error);
                }
                accounts = accs;
                account = accounts[0];

                try {
                    lupiManagerInstance = await lupiManager.deployed();
                    self.listenToLupiManagerEvents();
                    lupiManagerOwner = await lupiManagerInstance.owner();
                    document.getElementById("lupiManagerOwner").innerHTML = lupiManagerOwner;

                    if (lupiManagerOwner ==  "0x" ) {
                        throw("lupiManager at " + lupiManagerInstance.address + " returned 0x owner() - not deployed?");
                    }
                    await self.refreshGameInstance();
                    await self.refreshUI();
                    resolve();
                } catch(error) {
                    document.getElementById("loadingDiv").style.display = "none";
                    if(typeof lupiManagerInstance == "undefined" || lupiManagerOwner  == "0x") {
                        App.setStatus('danger', "Can't find any game on Ethereum network. Are you on testnet?");
                        document.getElementById("connectHelpDiv").style.display = "block";
                    } else {
                        App.setStatus('danger', "No game started yet. Owner can add one.<br>( LupiManager at " + lupiManagerInstance.address +")");
                        document.getElementById("connectHelpDiv").style.display = "none";
                    }
                    reject(error);
                }
            }); // getAccounts()
        }); // return new Promise()
    }, // window.start

    refreshGameInstance: async function() {
        var self = this;
        console.debug("refreshGameInstance");
        var res = await lupiManagerInstance.getGamesCount();

            // TODO: handle if no games or game address is 0x (same way as on App.start)
            var gamesCount = res.toNumber();
            var gameIdx = gamesCount - 1;
            if (gamesCount == 0) {
                throw new Error("refreshGameInstance(): no game registered for LupiManager at " + lupiManagerInstance.address);
            }
            document.getElementById("gameIdx").innerHTML = gameIdx;
            document.getElementById("gamesCount").innerHTML = gamesCount;

        gameInstance = Lupi.at( await lupiManagerInstance.games(gameIdx));

        self.listenToLupiEvents();
        document.getElementById("contractAddress").innerHTML = gameInstance.address;

        var gameInstanceOwner = await gameInstance.owner();
        document.getElementById("contractOwner").innerHTML = gameInstanceOwner;
        return gameInstance;
    }, // refreshGameInstance

    listenToLupiManagerEvents: function() {
        var startFromBlock ;
        var self = this;
        console.debug("listenToLupiManagerEvents");
        web3.eth.getBlockNumber( function(error, res) {
            startFromBlock = res ;
            lupiManagerInstance.e_GameCreated( {fromBlock: "latest", toBlock: "latest"}).watch( function(error, result) {
                if (error) {
                    console.error("listenToLupiManagerEvents() e_GameCreated error:", error);
                } else {
                    if(startFromBlock < result.blockNumber) {
                        console.debug("e_GameCreated");
                        self.removeLupiWatches().then( res => {
                            return self.refreshGameInstance()
                        }).then( res => {
                            self.refreshUI();
                        });
                    }
                }
            }); // e_GameCreated
        }); // getBlockNumber
    }, // listenToLupiManagerEvents

    removeLupiWatches: function() {
        return new Promise( resolve => {
            console.debug("removeLupiWatches");
            if (typeof gameInstance == "undefined") {
                resolve();
            } else {
                resolve( Promise.all( [
                                gameInstance.e_BetPlaced().stopWatching(),
                                gameInstance.e_RevealStarted().stopWatching(),
                                gameInstance.e_BetRevealed().stopWatching(),
                                gameInstance.e_WinnerDeclared().stopWatching()
                            ]));
            }
        }); // return new Promise()
    }, // removeLupiWatches()

    listenToLupiEvents: function() {
        var startFromBlock;
        var self = this;
        console.debug("listenToLupiEvents");
        web3.eth.getBlockNumber( function(error, res) {
            startFromBlock = res ;
            gameInstance.e_BetPlaced( {fromBlock: "latest", toBlock: "latest"}).watch( function(error, result) {
                if (error) {
                    console.error("listenToLupiEvents() e_BetPlaced error:", error);
                } else {
                    if(startFromBlock < result.blockNumber) {
                        console.debug("e_BetPlaced");
                        self.refreshUI();
                    }
                }
            }); // e_BetPlaced

            gameInstance.e_RevealStarted( {fromBlock: "latest", toBlock: "latest"}).watch( function(error, result) {
                if (error) {
                    console.error("listenToLupiEvents() e_RevealStarted error:", error);
                } else {
                    if(startFromBlock < result.blockNumber) {
                        console.debug("e_RevealStarted");
                        self.refreshUI();
                    }
                }
            }); // e_RevealStarted

            gameInstance.e_BetRevealed( {fromBlock: "latest", toBlock: "latest"}).watch( function(error, result) {
                if (error) {
                    console.error("listenToLupiEvents() e_BetRevealed error:", error);
                } else {
                    if(startFromBlock < result.blockNumber) {
                        console.debug("e_BetRevealed");
                        self.refreshUI();
                    }
                }
            }); // e_BetRevealed

            gameInstance.e_WinnerDeclared( {fromBlock: "latest", toBlock: "latest"}).watch( function(error, result) {
                if (error) {
                    console.error("listenToLupiEvents() e_WinnerDeclared error:", error);
                } else {
                    if(startFromBlock < result.blockNumber) {
                        console.debug("e_WinnerDeclared");
                        self.refreshUI();
                    }
                }
            }); // e_WinnerDeclared
        }); // getBlockNumber

    },  // listenToLupiEvents

    setStatus: function(severity, message) {
        var $status = $("#status");
        $status.removeClass().addClass('alert alert-'+severity).html(message);
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
        	text.innerHTML = "Hide subscribe form";
        }
    },

    toggleDebugInfo: function(message) {
        var ele = document.getElementById("massageDiv");
        var text = document.getElementById("toggleDebugInfoText");
        if(ele.style.display == "block") {
        		ele.style.display = "none";
        	text.innerHTML = "Show debug info";
        	}
        else {
        	ele.style.display = "block";
        	text.innerHTML = "Hide debug info";
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
        return new Promise( async function (resolve, reject) {
            // TODO: clear up errorhandling jungle + split this function
            var self = this;
            console.debug("refreshUI");
            try {
                document.getElementById("loadingDiv").style.display = "block";
                if (typeof(Storage) !== "undefined" && localStorage.length > 0) {
                    document.getElementById("backupDiv").style.display = "block";
                }
                document.getElementById("accountAddress").innerHTML = account;
                if ( document.getElementById("accountInput").value == "" ) {
                    document.getElementById("accountInput").value = account;
                }
                document.getElementById("lupiManagerAddress").innerHTML = lupiManagerInstance.address;

                web3.eth.getBlockNumber(function(error, res) {
                    if (error) {
                        console.error("refreshUI().getBlockNumber() error", error);
                        throw(error);
                    } else {
                        document.getElementById("latestBlock").innerHTML = res;
                        web3.eth.getBlock( res, function(error, res) {
                            if (error) {
                                console.error("refreshUI().getBlock() error", error);
                                throw(error);
                            } else {
                                document.getElementById("blockTimeStamp").innerHTML = res.timestamp;
                                document.getElementById("blockTimeStampFormatted").innerHTML = moment.unix(res.timestamp).format("DD MMM YYYY HH:mm:ss");
                            }
                        });
                    }
                }); // getBlockNumber()

                // would be greate to have Promises... (web3 1.0 will have... https://ethereum.stackexchange.com/questions/11444/web3-js-with-promisified-api)
                // var latestBlock = await web3.eth.getBlockNumber();
                // var blockTimeStamp = await web3.eth.getBlock(latestBlock);
                // $("#blockTimeStamp").innerHTML = res.timestamp;
                // $("#blockTimeStampFormatted").innerHTML = moment.unix(res.timestamp).format("DD MMM YYYY HH:mm:ss");


                web3.eth.getBalance(account, function(error, res) {
                    if (error) {
                        console.error("refreshUI().getBalance(account) error", error);
                        throw(error);
                    } else {
                        $("#accountBalance").text(  web3.fromWei(res).valueOf() );
                    }
                });

                web3.eth.getBalance(lupiManagerInstance.address, function(error, res) {
                    if (error) {
                        console.error("refreshUI().getBalance(lupiManagerInstance.address) error", error);
                        throw(error);
                    } else {
                        $("#lupiManagerBalance").text( web3.fromWei(res).valueOf() );
                    }
                });

                web3.eth.getBalance(gameInstance.address, function(error, res) {
                    if (error) {
                        console.error("refreshUI().getBalance(gameInstance.address) error", error);
                        throw(error);
                    } else {
                        document.getElementById("contractBalance").innerHTML = web3.fromWei(res).valueOf();
                        document.getElementById("connectHelpDiv").style.display = "none";
                    }
                }); // getBalance(gameInstance)

                var roundInfo = new LupiHelper.RoundInfo( await gameInstance.getRoundInfo());
                document.getElementById("currentPotAmount").innerHTML = web3.fromWei(roundInfo.currentPotAmount);
                document.getElementById("requiredBetAmount").innerHTML = web3.fromWei(roundInfo.requiredBetAmount);
                document.getElementById("ticketCount").innerHTML = roundInfo.ticketCount;
                document.getElementById("revealedCount").innerHTML = roundInfo.revealedCount;
                document.getElementById("unRevealedCount").innerHTML = roundInfo.ticketCount - roundInfo.revealedCount;
                document.getElementById("ticketCount2").innerHTML = roundInfo.ticketCount;

                document.getElementById("revealPeriodLength1").innerHTML  = countdown(0, roundInfo.revealPeriodLength*1000).toString();
                document.getElementById("revealPeriodLength2").innerHTML  = countdown(0, roundInfo.revealPeriodLength*1000).toString();
                var bettingPeriodEndsText = roundInfo.ticketCountLimit == 0 ? "" : "when " + roundInfo.ticketCountLimit + " bets are placed";
                bettingPeriodEndsText += roundInfo.ticketCountLimit !== 0 && roundInfo.bettingPeriodEnds != 0 ? " or " : "";
                bettingPeriodEndsText += roundInfo.bettingPeriodEnds == 0 ? "" : "latest on " + moment.unix(roundInfo.bettingPeriodEnds).format("DD MMM YYYY HH:mm:ss");
                document.getElementById("bettingPeriodEndsText").innerHTML = bettingPeriodEndsText;
                document.getElementById("revealPeriodEnds").innerHTML = moment.unix(roundInfo.revealPeriodEnds).format("DD MMM YYYY HH:mm:ss");
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

                var bettingOver = ( roundInfo.ticketCount == roundInfo.ticketCountLimit && roundInfo.ticketCountLimit != 0)
                    || ( roundInfo.bettingPeriodEnds <  moment().utc().unix()  && roundInfo.bettingPeriodEnds != 0);
                var guessingOpen = roundInfo.state == 0 && !bettingOver;
                var revealStart = roundInfo.state == 0 && bettingOver;
                var revealRunning = roundInfo.state == 1 && roundInfo.revealedCount < roundInfo.ticketCount;
                var revealOverNotAllRevealed = roundInfo.state == 1 && roundInfo.revealedCount !== roundInfo.ticketCount &&
                       roundInfo.revealPeriodEnds <  moment().utc().unix() ;
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
                document.getElementById("loadingDiv").style.display = "none";
                resolve();
            } catch (error) {
                document.getElementById("loadingDiv").style.display = "none";
                console.error("refreshUI() error", error);
                self.setStatus('danger', "Error updating data; see log.");
                reject(error);
            }
        }); // return new Promise()
    },

    placeBet: async function() {
        var self = this;
        try {
            self.setStatus('info', "Initiating transaction... (please wait)");
            var guess = parseInt(document.getElementById("guess").value);
            // TODO: do disable for all submit not only for bets + add spinner/info to sign + do it nicer
            var placeBetButton = document.getElementById("placeBetButton"); //
            placeBetButton.disabled = true;

            var roundInfo = new LupiHelper.RoundInfo(await gameInstance.getRoundInfo());
            var salt = "0x" + LupiHelper.toHexString( secureRandom(32, {type: 'Array'}));
            var sealedBet = await gameInstance.sealBetForAddress(account.toString(), guess, salt);

            var gasEstimate = LupiHelper.GAS.placeBetLast.gas; // must use gas estimate for last because other bets could have landed...
            var gasPrice = Math.round(LupiHelper.GAS.placeBetLast.price * await LupiHelper.getDefaultGasPrice());

            var tx = await gameInstance.placeBet(sealedBet, {from: account, value: roundInfo.requiredBetAmount,
                                            gas: gasEstimate, gasPrice: gasPrice})
            console.debug("placeBet() gas used:" , tx.receipt.gasUsed);
            if( tx.receipt.gasUsed == gasEstimate) {
                throw("placeBet error, all gas used: " + tx.receipt.gasUsed);
            }
            var ticketId = tx.logs[0].args.ticketId.toNumber() ;
            var status = "Successful guess",
                severity = 'success';
            try {
                var ticket = new LupiHelper.Ticket(ticketId, guess, salt, account, false);
                var ticketStore;
                ticketStore = JSON.parse( localStorage.getItem(gameInstance.address));
                if (ticketStore == null ) {
                    ticketStore = new Array();
                }
                ticketStore.push(ticket);
                localStorage.setItem(gameInstance.address, JSON.stringify(ticketStore));

                status += "<br><strong>1. IMPORTANT: </strong>"
                        + "<a href='#self' onclick='App.exportTickets(); return false;'>"
                        + "Download your tickets " + "</a> for backup.";
                severity = 'info';
            } catch(error) {
                severity = 'alert';
                status += " but couldn't save your secret key locally. "
                        + "<br> <strong>1. IMPORTANT:</strong> Save this information to be able to reveal your bet:"
                        + "<br> Ticket id: " + ticketId
                        + "<br> Guess: " + guess
                        + "<br> Secret key: " +  salt
                        + "<br> Account: " + account.toString();
                console.error("Placebet() save to localstorage", error);
                placeBetButton.disabled = false;
            }
            status += "<br><strong>2. Subscribe for notifications </strong> below to know when you need to reveal your ticket</font>";
            self.setStatus(severity, status);
            self.refreshUI();
            placeBetButton.disabled = false;
        } catch(error) {
            console.error("App.placeBet error", error);
            self.refreshUI();
            self.setStatus('danger', "Error sending your guess; see log.");
            placeBetButton.disabled = false;
        } // try-catch
    }, // placeBet()

    exportTickets: function() {
        // FIXME: parse uses localStorage too, export only lupi game related entires, eg. add lupi/ prefix to key
        var toSave = [JSON.stringify(localStorage, null, 2)];
        var toSaveBlob = new Blob(toSave, {type: "data:application/json"})
        FileSaver.saveAs(toSaveBlob, "TicketBackup"
            + moment().format("YYYYMMDDHHmmss")
            + ".json");
    }, // downloadTickets

    subscribeAlert: function() {
        var self = this;
        self.setStatus('info', "Initiating transaction... (please wait)");
        var email =  document.getElementById("emailInput").value;
        Parse.initialize("CHytB89n9X0rzg3agIPt5QyWb2yTKv3oSf1Z3PQ2", "QNEEQJ0tCpgMbyWrtwErZC2Ck31gPRV3mng9sHxl");
        Parse.serverURL = 'https://parseapi.back4app.com';
        var Subscription = Parse.Object.extend("Subscription");
        var subscription = new Subscription();

        subscription.set("email", email);
        subscription.set("gameAddress", gameInstance.address);

        subscription.save(null, {
          success: function(subscription) {
            self.setStatus('success', "Successful subscription for " + email);
          },
          error: function(subscription, error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            console.error('subscribeAlert() error:', error);
            self.setStatus('danger', "Can't save subscription. " + error.message);
          }
        });
    }, // subscribeAlert

    importTickets: function(filePath) {
        var self = this;
        var output = "", reader;

        if (window.File && window.FileReader && window.FileList && window.Blob) {
            reader = new FileReader();
        } else {
            alert('');
            self.setStatus('danger', "Can't restore tickets: the File APIs are not fully supported by your browser."
                + "<br>Try again with an up to date browser or reveal your tickets by entering ticket info manually");
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
        self.setStatus('success', "Successful ticket import from "+ filePath.files[0].name);
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

    startRevealing: async function() {
        var self = this;
        try {
            self.setStatus('info', "Initiating transaction... (please wait)");
            var gasEstimate = LupiHelper.GAS.startRevealing.gas;
            var gasPrice = Math.round(LupiHelper.GAS.startRevealing.price * await LupiHelper.getDefaultGasPrice());
            var tx = await gameInstance.startRevealing({from: account, gas: gasEstimate, gasPrice: gasPrice })
            console.debug("startRevealing() gas used:" , tx.receipt.gasUsed);
            if( tx.receipt.gasUsed == gasEstimate) {
                throw("startRevealing error, all gas used: " + tx.receipt.gasUsed);
            }
            var roundInfo = new LupiHelper.RoundInfo( await gameInstance.getRoundInfo());
            self.setStatus('success', "Reveal period started.");
        } catch(error) {
            console.error("startRevealing() error", error);
            self.setStatus('danger', "Error while starting to reveal; see log.");
        } // try-catch
    },

    manualRevealBet: function() {
        var self = this;
        var accountInput = document.getElementById("accountInput").value;
        var ticketId = parseInt(document.getElementById("ticketId").value);
        var guess = parseInt(document.getElementById("revealGuess").value);
        var salt = document.getElementById("salt").value;
        var ticket = new LupiHelper.Ticket(ticketId, guess, salt, accountInput);

        App.revealBet(gameInstance.address, ticket);
    },

    revealBet: async function( gameAddress, ticket) {
        var self = this;
        try {
            self.setStatus('info', "Initiating transaction... (please wait)");
            var roundInfo = new LupiHelper.RoundInfo( await gameInstance.getRoundInfo());
            var gasEstimate, gasPrice;
            if (roundInfo.revealedCount == 0) {
                gasEstimate = LupiHelper.GAS.revealBetFirst.gas;
                gasPrice = Math.round(LupiHelper.GAS.revealBetFirst.price * await LupiHelper.getDefaultGasPrice());
            } else {
                gasEstimate = LupiHelper.GAS.revealBet.gas;
                gasPrice = Math.round(LupiHelper.GAS.revealBet.price * await LupiHelper.getDefaultGasPrice());
            }
            var tx = await gameInstance.revealBetForAddress(ticket.account, ticket.ticketId, ticket.guess, ticket.salt,
                        {from: account, gas: gasEstimate, gasPrice: gasPrice });
            console.debug("revealBetForAddress() gas used:" , tx.receipt.gasUsed);
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
            self.setStatus('success', "Bet revealed</font>" );
            self.refreshUI();
        } catch(error) {
            console.error("revealBet() error", error);
            self.refreshUI();
            self.setStatus('danger', "Error while revealing your guess; see log.</font>")
        } // try-catch
    }, // revealBet()

    declareWinner: async function() {
        var self = this;
        try {
            self.setStatus('info', "Initiating transaction, please wait.");
            var gasPrice = Math.round(LupiHelper.GAS.declareWinner.price * await LupiHelper.getDefaultGasPrice());
            var roundInfo = new LupiHelper.RoundInfo( await gameInstance.getRoundInfo());
            var gasEstimate = LupiHelper.GAS.declareWinner.gasBase
                        + roundInfo.revealedCount * LupiHelper.GAS.declareWinner.gasPerGuess;

            var tx = await gameInstance.declareWinner({from: account, gas: gasEstimate, gasPrice: gasPrice })
            console.debug("declareWinner() gas used:" , tx.receipt.gasUsed);
            if( tx.receipt.gasUsed == gasEstimate) {
                throw("declareWinner error, all gas used: " + tx.receipt.gasUsed);
            }
            self.setStatus('success', "Winner declared" );
            self.refreshUI();
        } catch(error) {
            console.error("declareWinner() error", error);
            self.refreshUI();
            self.setStatus('danger', "Error while declaring winner; see log.");
        } // try-catch
    },

    payWinner: async function() {
        var self = this;
        try {
            self.setStatus('info', "Initiating transaction, please wait");
            var gasEstimate = LupiHelper.GAS.payWinner.gas;
            var gasPrice = Math.round(LupiHelper.GAS.payWinner.price * await LupiHelper.getDefaultGasPrice());
            var tx = await gameInstance.payWinner( {from: account, gas: gasEstimate, gasPrice: gasPrice })
            console.debug("payWinner() gas used:" , tx.receipt.gasUsed);
            if( tx.receipt.gasUsed == gasEstimate) {
                throw("payWinner error, all gas used: " + tx.receipt.gasUsed);
            }
            self.setStatus('success', "Winner paid" );
            self.refreshUI();
        } catch(error) {
            console.error("payWinner() error", error);
            self.refreshUI();
            self.setStatus('danger', "Error while paying winner; see log.");
        } // try-catch
    },

    refund: async function() {
        var self = this;
        try {
            self.setStatus('info', "Initiating transaction... (please wait)");
            var ticketId =  parseInt(document.getElementById("refundTicketId").value);
            var gasEstimate = LupiHelper.GAS.refund.gas;
            var gasPrice = Math.round(LupiHelper.GAS.refund.price * await LupiHelper.getDefaultGasPrice());
            var tx = await gameInstance.refund( ticketId, {from: account, gas: gasEstimate, gasPrice: gasPrice})
            console.debug("refund() gas used:" , tx.receipt.gasUsed);
            if( tx.receipt.gasUsed == gasEstimate) {
                throw("refund error, all gas used: " + tx.receipt.gasUsed);
            }
            self.setStatus('success', "Ticket refunded" );
            self.refreshUI();
        } catch(error) {
            console.error("refund() error", error);
            self.refreshUI();
            self.setStatus('danger', "Error while refunding; see log.");
        } // try-catch
    },

    createGame: async function() {
        var self = this;
        try {
            self.setStatus('info', "Initiating transaction, please wait");
            var requiredBetAmount = web3.toWei( document.getElementById("requiredBetAmountInput").value, "ether" );
            var ticketCountLimit = parseInt(document.getElementById("ticketCountLimitInput").value);
            var revealPeriodLength = parseInt(document.getElementById("revealPeriodLengthInput").value) * 60;
            var bettingPeriodLength = parseInt(document.getElementById("bettingPeriodLengthInput").value) * 60;
            var feePt = document.getElementById("feePtInput").value * 10000;
            var gasEstimate = lupiManagerHelper.GAS.createGame.gas;
            var gasPrice = Math.round(lupiManagerHelper.GAS.createGame.price * await LupiHelper.getDefaultGasPrice());

            var tx = await lupiManagerInstance.createGame(requiredBetAmount, ticketCountLimit, bettingPeriodLength, revealPeriodLength, feePt,
                     {from: account, gas: gasEstimate, gasPrice: gasPrice})

            console.debug("createGame() gas used:" , tx.receipt.gasUsed);
            if( tx.receipt.gasUsed == gasEstimate) {
                throw("createGame error, all gas used: " + tx.receipt.gasUsed);
            }
            var scheduleStatus;
            try {
                if( bettingPeriodLength > 0 ) {
                    await self.scheduleStartRevealing(tx.logs[2].args.gameAddress);
                    scheduleStatus = "<br>Automatic reveal scheduled."
                } else {
                    scheduleStatus = "<br>Didn't schedule automatic reveal because betting period end is not set."
                }
            } catch (error) {
                console.error("error with scheduleStartRevealing", error);
                scheduleStatus = "<br><strong>ERROR:</strong> Couldn't schedule automatic revealing. Does the LupiManager have enough balance? Please check logs.";
            }
            self.setStatus('success', "Game created. Idx: " + tx.logs[2].args.gameIdx
            + " address: " + tx.logs[1].args.gameAddress
            + scheduleStatus );
            $('#createGameDivModal').modal('hide');
        } catch(error) {
            console.error("createGame() error", error);
            self.setStatus('danger', "Error while creating game; see log.");
        } // try-catch
    },

    scheduleStartRevealing: function(gameAddress) {
        return new Promise( async function (resolve, reject) {
            var self = this;
            try {
                var gasEstimate = lupiManagerHelper.GAS.scheduleStartRevealing.gas;

                var gasPrice = Math.round(lupiManagerHelper.GAS.scheduleStartRevealing.price * await LupiHelper.getDefaultGasPrice());
                var tx = await lupiManagerInstance.scheduleStartRevealing( gameAddress,
                                {from: account, gas: gasEstimate, gasPrice: gasPrice})
                var queryId = tx.logs[0].args.queryId;
                if (typeof queryId == "undefined") {
                    var errorMsg = tx.logs[0].args.error;
                    throw("scheduleStartRevealing error. Error received instead of queryId: " + errorMsg);
                }
                console.debug("scheduleStartRevealing() Oraclize queryId:" , queryId);
                console.debug("scheduleStartRevealing() gas used:" , tx.receipt.gasUsed);
                if( tx.receipt.gasUsed == gasEstimate) {
                    throw("scheduleStartRevealing error. All gas used: " + tx.receipt.gasUsed, tx);
                }
                resolve(tx);
            } catch(error) {
                reject(error);
            } // try-catch
        }); // return new Promise
    } // scheduleStartRevealing
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source.");
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
