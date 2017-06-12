var lupi = artifacts.require("./lupi.sol");

contract("lupi", function(accounts) {
    var instance, ownerAddress;
    var gasUseLog = new Array();

    before(function(done) {
        lupi.deployed()
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            done();
        });
    }) // before()

    function logGasUse(tran, tx) {
        gasUseLog.push(  [tran, tx.receipt.gasUsed ]);
    } //  logGasUse ()

    it('should be possible to change owner', function(done) {
        var newOwner = accounts[1];

        instance.setOwner(newOwner, { from: ownerAddress })
        .then( tx => {
            logGasUse("setOwner() by owner", tx);
            assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
            assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
            assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, newOwner, "owner() should return the new owner");
            ownerAddress = newOwner;
            done();
        });
    }); // should be possible to change owner

    it('should only the current owner change owner', function(done) {
        var newOwner = accounts[2];

        instance.setOwner(newOwner, { from: newOwner })
        .then( tx => {
            logGasUse("setOwner() by non owner", tx);
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
