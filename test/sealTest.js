var lupi = artifacts.require("./Lupi.sol");
var helper = new require('./helpers/testHelper.js');

contract("Lupi seal tests", accounts => {
    var instance, ownerAddress;

    before(done => {
        lupi.new(1, 1, 0, 1, 1)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            done();
        });
    }); // before()

    var salt1 = "0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c";
    var expected = "0x9546122e203e0cd4bf7e6bdc536575542bef986ebebbd84e7cdc794d5ac556e1";

    it('should be possible to seal a bet for myself', async function () {
        var res = await instance.sealBet(2, salt1, { from: accounts[1] });
        assert.equal(res, expected, "sealBet(number, salt) result should be as expected");
    }); // should be possible to seal a bet for myself

    it('should be possible to seal a bet for someone else when passing account address as accounts[1]', async function () {
        return Promise.all( [
            instance.sealBetForAddress(accounts[1].toString(), 2, salt1)
            .then( res => {
                assert.equal(res, expected, "sealBet(player, number, salt) result should be as expected");
                return res;
            }),

            instance.sealBetForAddress(accounts[1], 2, salt1, { from: accounts[2] })
            .then( res => {
                assert.equal(res, expected, "sealBet(player, number, salt) result should be as expected when passing account address when calling with {from: }");
                return res;
            }),

            instance.sealBetForAddress("0x94011c67bc1e6448ed4b8682047358ca6cd09470", 2, salt1, { from: accounts[2] })
            .then( res => {
                assert.equal(res, expected, 'sealBet(player, number, salt) result should be as expected when passing account address as "0xfff..." ');
                return res;
            }),
        ]); // Promise.all()
    });// should be possible to seal a bet for someone else

    it("shouldn't be possible to seal a bet 0 number", async function () {
        if (web3.version.network == 1976) {  // on privatechain , network set by .runprivatechain.sh (geth ...  --networkid 1976 ..)
            res = await instance.sealBet(0, salt1, { from: accounts[1] });
            assert.equal(res, "0x", "sealBet with number 0 should return 0x on privatechain");
        } else {
            await helper.expectThrow(instance.sealBet(0, salt1, { from: accounts[1] }));
        }
    }); // shouldn't be possible to seal a bet 0 number

});
