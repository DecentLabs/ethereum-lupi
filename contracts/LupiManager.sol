pragma solidity ^0.4.11;

import "./Owned.sol";
import "./Lupi.sol";
import "./usingOraclize.sol";

contract LupiManager is owned, usingOraclize {

    address[] public games;

    uint8 constant public CB_EXTRA_SECS = 1; // TODO: check/test for optimal value

    // *** These are hacks for cheaper string comparison at callback
    string constant public START_REVEALING = "StartRevealing";
    string constant public DECLARE_WINNER = "DeclareWinner";
    string constant public REFUND_OR_PAY_WINNER = "RefundOrPayWinner";
    bytes32 constant public START_REVEALING_HASH = sha3(START_REVEALING); //0x11e1d5ec29523c70e6e80abcfe6865c6362b41cc5e0a8039379d59ffc43b52b5; // "StartRevealing"
    bytes32 constant public DECLARE_WINNER_HASH = sha3(DECLARE_WINNER); //0xc4c3af3f7bf0c4effb9be5170fb3db9f8e6431f11d245ac3b640ea1a9ea055cd; // "DeclareWinner"
    bytes32 constant public REFUND_OR_PAY_WINNER_HASH = sha3(REFUND_OR_PAY_WINNER);// 0xda753bb89006833f24486fde26a787b8d456e919b647bef9a9152c1e9ad88c00; // "RefundOrPayWinner"

    // *** errors & warnings for event logs
    string constant public ERR_SCH_NOT_ENOUGH_BALANCE = "Contract balance is not enough to schedule Oraclize call";
    string constant public ERR_SCH_BETTINGPERIODEND_NOT_SET = "Can't schedule startRevealing: bettingPeriodEnds is not set.";
    string constant public ERR_SCH_REVEAL_ALREADY_STARTED = "Can't schedule startRevealing: revealing already started.";
    string constant public SUCCESS_CB = "Successful callback";
    string constant public ERR_CB_INVALID_QUERYID = "Invalid queryId";
    string constant public ERR_CB_INVALID_RESULTRCV = "Invalid resultRcv";
    string constant public WARN_CB_REVEAL_ALREADY_STARTED = "Revealing already started. Skipping";

    uint public oraclizeGasPrice;
    uint public gasStartRevealingCallBack;
    uint public gasRevealPerTicketCallBack;
    uint public gasDeclareWinnerBaseCallBack;
    uint public gasDeclareWinnerPerTicketCallBack;
    uint public gasRefundPerTicketCallBack;
    uint public gasPayWinnerCallBack;

    mapping(bytes32 => address) m_queries;

    function LupiManager(uint _oraclizeGasPrice, uint _gasStartRevealing, uint _gasRevealPerTicket,
        uint _gasDeclareWinnerBase, uint _gasDeclareWinnerPerTicket,
        uint _gasRefundPerTicket, uint _gasPayWinner) {

        setGasParams(_oraclizeGasPrice, _gasStartRevealing, _gasRevealPerTicket,
                _gasDeclareWinnerBase, _gasDeclareWinnerPerTicket,
                _gasRefundPerTicket,  _gasPayWinner);
        oraclize_setProof(proofType_NONE);
    }

    function () payable { // required to be able to top in order to pay for Oraclize callbacks
    }
    // TODO: fx to send money back to owner, figure out topup mechanics.

    function setGasParams(uint _oraclizeGasPrice, uint _gasStartRevealing, uint _gasRevealPerTicket,
            uint _gasDeclareWinnerBase, uint _gasDeclareWinnerPerTicket,
            uint _gasRefundPerTicket, uint _gasPayWinner) onlyOwner {
        oraclizeGasPrice = _oraclizeGasPrice;
        oraclize_setCustomGasPrice(_oraclizeGasPrice);
        // TODO: if oraclizeGasPrice set (if not then read default?) then setCustomGasPrice(oraclizeGasPrice);
        gasStartRevealingCallBack = _gasStartRevealing;
        gasRevealPerTicketCallBack = _gasRevealPerTicket;
        gasDeclareWinnerBaseCallBack = _gasDeclareWinnerBase;
        gasDeclareWinnerPerTicketCallBack = _gasDeclareWinnerPerTicket;
        gasRefundPerTicketCallBack = _gasRefundPerTicket;
        gasPayWinnerCallBack = _gasPayWinner;
    }

    function getGamesCount() public constant returns (uint ct) {
        return games.length;
    }

    function getOraclizeCbAddress() constant returns (address ret) {
        return oraclize_cbAddress();
    }

    event e_GameAdded(uint indexed gameIdx, address gameAddress);
    function addGame(address _address) onlyOwner returns (uint idx) {
        idx = games.push( _address)  - 1;
        e_GameAdded(idx, _address);
        return idx;
    }

    event e_GameCreated(address gameAddress);
    function createGame(uint _requiredBetAmount, uint _ticketCountLimit, uint _bettingPeriodEnd,
         uint _revealPeriodLength, uint _feePt) onlyOwner returns (uint gameIdx, address gameAddress) {
        gameAddress = new Lupi(_requiredBetAmount, _ticketCountLimit, _bettingPeriodEnd, _revealPeriodLength, _feePt);
        Lupi gameInstance = Lupi(gameAddress);
        gameInstance.setOwner(owner);
        e_GameCreated(gameAddress);
        gameIdx = addGame(gameAddress);
        return (gameIdx, gameAddress);
    }

    event e_OraclizeScheduleError(string error);
    event e_startRevealingScheduled(bytes32 queryId);
    function scheduleStartRevealing(address gameAddress) payable returns (bytes32 queryId) {
        if (oraclize_getPrice("identity", gasStartRevealingCallBack ) > this.balance) {
            e_OraclizeScheduleError(ERR_SCH_NOT_ENOUGH_BALANCE);
            return 0;
        }
        Lupi gameInstance = Lupi(gameAddress);

        if ( gameInstance.state() != Lupi.State.Betting ) {
            e_OraclizeScheduleError(ERR_SCH_REVEAL_ALREADY_STARTED);
            return 0;
        }

        if ( gameInstance.bettingPeriodEnds() == 0 ) {
            e_OraclizeScheduleError(ERR_SCH_BETTINGPERIODEND_NOT_SET);
            return 0;
        }

        uint cbTimeStamp = gameInstance.bettingPeriodEnds() + CB_EXTRA_SECS;
        queryId = oraclize_query(cbTimeStamp, "identity", START_REVEALING, gasStartRevealingCallBack);
        m_queries[queryId] = gameAddress;
        e_startRevealingScheduled(queryId);
        return queryId;
    }

    function scheduleRevealBet(string encryptedTicket, address gameAddress, uint gasEst) payable returns (bytes32 queryId) {
        // encryptedTicket: ticket encrypted with Oraclize's public key
        // revealTime:
        return 0;
    }

    event e_OraclizeCallBackLog(bytes32 queryId, string resultRcv, string msg);
    function __callback(bytes32 queryId, string resultRcv) {
        require (msg.sender == oraclize_cbAddress() || msg.sender == owner ); // allow owner for tests

        if (m_queries[queryId] == address(0) ) {
             e_OraclizeCallBackLog(queryId, resultRcv, ERR_CB_INVALID_QUERYID);
             return;
        }

        Lupi gameInstance = Lupi(m_queries[queryId]);
        bytes32 res = sha3(resultRcv);

        if (res == START_REVEALING_HASH ) {
            if(gameInstance.state() != Lupi.State.Betting ) {
                e_OraclizeCallBackLog(queryId, resultRcv, WARN_CB_REVEAL_ALREADY_STARTED);
                return;
            }
            gameInstance.startRevealing();
            e_OraclizeCallBackLog(queryId, resultRcv, SUCCESS_CB);
            // TODO: schedule declareWinner on bettingPeriodEnd + treshold + revealPeriodLength
        // TODO:
        // } else if (res == DECLARE_WINNER_HASH ) {
        // } else if (res == REFUND_OR_PAY_WINNER_HASH ) {
        } else {
           e_OraclizeCallBackLog(queryId, resultRcv, ERR_CB_INVALID_RESULTRCV);
        }
    }

}
