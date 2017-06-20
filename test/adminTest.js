var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/helper.js');

contract("Lupi admin tests", accounts => {
    var instance, ownerAddress;
    var requiredBetAmount = 1000000000000000000;
    var ticketCountLimit = 2;
    var feePt = 10000;
    var revealPeriodLength = 14400;

    before(done => {
        lupi.new(requiredBetAmount, ticketCountLimit, revealPeriodLength, feePt)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            done();
        });
    }) // before()

    it('contract should be setup with initial parameters', function() {
        return instance.getRoundInfo()
        .then( res => {
            assert.equal(res[0], 0, "state should be 'Betting' (0)");
            assert.equal(res[1], requiredBetAmount, "requiredBetAmount should be set");
            assert.equal(res[2], feePt, "feePt should be set");
            assert.equal(res[3], ticketCountLimit, "ticketCountLimit should be set");
            assert.equal(res[4], revealPeriodLength, "revealPeriodLength should be set");
            assert.equal(res[5], 0, "ticketCount should be 0");
            assert.equal(res[6], 0, "reveleadCount should be 0");
            assert.equal(res[7], 0, "feeAmount should be 0");
            assert.equal(res[8], 0, "winnablePot should be 0");
            assert.equal(res[9], 0, "winningTicket should be 0");
            assert.equal(res[10], 0, "winnerAddress should be 0");
            assert.equal(res[11], 0, "winningNumber should be set");
            assert.equal(res[12], 0, "revealPeriodEnds should be 0");
            return res;
        });
    });

    it('should be possible to change owner', done => {
        var newOwner = accounts[1];

        instance.setOwner(newOwner, { from: ownerAddress })
        .then( tx => {
            helper.logGasUse("Change Owner", "setOwner() by owner", tx);
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

    it('should only the current owner change owner', done => {
        var newOwner = accounts[2];
        instance.setOwner(newOwner, { from: newOwner })
        .then( tx => {
            helper.logGasUse("Change Owner", "setOwner() by non owner", tx);
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
            done();
        });
    }); // should be possible to change owner

    it('feeAmount should be less than requiredBetAmount', async function() {
        return helper.expectThrow( lupi.new(web3.toWei(1), 1, 1, 1000000, { account: accounts[0], gas: 3000000}))
        .then( res => {
            return;
        }); // expectThrow
    }); // feeAmount should be less than requiredBetAmount

    it('ticketCount limit should be greater than 0', async function() {
        return helper.expectThrow( lupi.new(web3.toWei(1), 0, 1, 10000, { account: accounts[0], gas: 3000000}))
        .then( res => {
            return;
        }); // expectThrow
    }); // ticketCount limit should be greater than 0

    it('revealPeriodLength should be greater than 0', async function() {
        return helper.expectThrow( lupi.new(web3.toWei(1), 1, 0, 10000, { account: accounts[0], gas: 3000000}))
        .then( res => {
            return;
        }); // expectThrow
    }); // revealPeriodLength should be greater than 0

}); // contract("lupi")
