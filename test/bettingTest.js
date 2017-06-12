var lupi = artifacts.require("./lupi.sol");

contract("lupi", function(accounts) {
    var instance, ownerAddress;
    var gasUseLog = new Array();
    var salt = 0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c;
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
    }); // before()

    it('contract should be set with initial parameters', function(done) {
        return instance.getRoundInfo()
        .then( res => {
            assert.equal(res[0], 0, "state should be 'Betting' (0)");
            assert(false, "TODO: assert other round params with bignumber compare");
            done();
        });
    });

    it('should be possible to seal a bet for myself', function() {
        var sealedBet = 0x8eee4611778dd1659049d56a6f0ead527aad090d423fdc19c1407f586aa5ebff;

        return instance.sealBet(13, salt, { from: accounts[1] })
        .then( res => {
            assert.equal(res, sealedBet, "the encrypted bet should be correct when sealing for myself");
        });
    });

    it('should be possible to seal a bet for someone else', function() {
        var sealedBet = 0x3b38b891f95913208ac1d002d2e838266c1004783ee9633a01439d649c6978e1;

        return instance.sealBet(accounts[1], 13, salt , { from:accounts[0] })
        .then( res => {
            assert.equal(res, sealedBet, "the sealed Bet bet should be correct when sealing for an other player");
        });
    });

    it('should be possible to place a bet', function() {
        var sealedBet = 0x8eee4611778dd1659049d56a6f0ead527aad090d423fdc19c1407f586aa5ebff;

        assert(false, "test TODO");
    });

    it('should be possible to reveal a bet', function() {
        var sealedBet = 0x3b38b891f95913208ac1d002d2e838266c1004783ee9633a01439d649c6978e1;

        assert(false, "test TODO");
    });

    after( function() {
      // runs after all tests in this block
      console.log("=========== GAS USAGE STATS ===========");
      console.log("transaction,  gas used");
      console.log(gasUseLog);
    });

}); // contract("lupi")
