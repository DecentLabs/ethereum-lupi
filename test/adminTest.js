var lupi = artifacts.require("./Lupi.sol");

contract("Lupi", function(accounts) {
    var instance, ownerAddress;
    var gasUseLog = new Array();
    var requiredBetAmount = 1000000000000000000;
    var ticketCountLimit = 2;
    var feePt = 10000;

    before(function(done) {
        lupi.new(requiredBetAmount, ticketCountLimit, feePt)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            done();
        });
    }) // before()

    function logGasUse(testname, tran, tx) {
        gasUseLog.push(  [testname, tran, tx.receipt.gasUsed ]);
    } //  logGasUse ()

    it('contract should be setup with initial parameters', function() {
        return instance.getRoundInfo()
        .then( res => {
            assert.equal(res[0], 0, "state should be 'Betting' (0)");
            assert.equal(res[1], requiredBetAmount, "requiredBetAmount should be set");
            assert.equal(res[2], feePt, "feePt should be set");
            assert.equal(res[3], ticketCountLimit, "ticketCountLimit should be set");
            assert.equal(res[4], 0, "ticketCount should be 0");
            assert.equal(res[5], 0, "reveleadCount should be 0");
            assert.equal(res[6], 0, "feeAmount should be 0");
            assert.equal(res[7], 0, "winnablePot should be 0");
            assert.equal(res[8], 0, "winningTicket should be 0");
            assert.equal(res[9], 0, "winnerAddress should be 0");
            assert.equal(res[10], 0, "winningNumber should be 0");

        });
    });

    it('should be possible to change owner', function(done) {
        var newOwner = accounts[1];

        instance.setOwner(newOwner, { from: ownerAddress })
        .then( tx => {
            logGasUse("Change Owner", "setOwner() by owner", tx);
            assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
            assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
            assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, newOwner, "owner() should return the new owner");
            ownerAddress = newOwner;
            return instance.getRoundInfo()
        }).then( res => {
            done();
        });
    }); // should be possible to change owner

    it('should only the current owner change owner', function(done) {
        var newOwner = accounts[2];

        instance.setOwner(newOwner, { from: newOwner })
        .then( tx => {
            logGasUse("Change Owner", "setOwner() by non owner", tx);
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
            done();
        });
    }); // should be possible to change owner

    after( function() {
      // runs after all tests in this block
      console.log("=========== GAS USAGE STATS ===========");
      console.log("transaction,  gas used");
      console.log(gasUseLog);
    });

}); // contract("lupi")
