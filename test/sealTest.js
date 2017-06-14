var lupi = artifacts.require("./Lupi.sol");

contract("Lupi", function(accounts) {
    var instance, ownerAddress;

    before(function(done) {
        lupi.new(1, 1, 1)
        .then( contractInstance => {
            instance = contractInstance;
            return instance.owner();
        }).then( ownerRes => {
            ownerAddress = ownerRes;
            done();
        });
    }); // before()


    // with this we can't get the same result as in REMIX:
    // var salt1 = 0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c;

    // this is the only way it can work
    var salt1 = "0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1c";
    var expected = "0x9546122e203e0cd4bf7e6bdc536575542bef986ebebbd84e7cdc794d5ac556e1";

    it('should be possible to seal a bet for myself', function( ) {
        // FIXME: can't make this work
        // console.log("sealTest. Account:", accounts[1], 'salt = "0xdb8780d713083a9addb6494cfc767d6ef4b1358315737e06bbb7fd84cc493d1"');
        return instance.sealBet(2, salt1, { from: accounts[1] })
        .then( res => {
            //console.log("a) ", res);
            assert.equal(res, expected, "FIXME, known issue: sealBelt(number, salt) result should be as expected");
        });
        /* These don't work either each gets bet wiht a different result :-O
        instance.sealBet(2, salt1, { from: 0x94011c67bc1e6448ed4b8682047358ca6cd09470 })
        .then( res => {
            console.log("b) ", res);
        });

        return instance.sealBet(2, salt1, { from: '"' + accounts[1].toString() + '"'})
        .then( res => {
            //console.log("a) ", res);
            assert.equal(res, expected, "sealBelt(number, salt) result should be as expected");
        });
        */
    }); // should be possible to seal a bet for myself

    it('should be possible to seal a bet for someone else when passing account address as accounts[1]', function() {
        return Promise.all( [
            instance.sealBet(accounts[1].toString(), 2, salt1)
            .then( res => {
                // console.log("other a) ", res);
                assert.equal(res, expected, "sealBelt(player, number, salt) result should be as expected");
                return res;
            }),

            instance.sealBet(accounts[1], 2, salt1, { from: accounts[2] })
            .then( res => {
                //console.log("other b) ", res);
                assert.equal(res, expected, "sealBelt(player, number, salt) result should be as expected when passing account address when calling with {from: }");
                return res;
            }),

            /* This throws an error :
            instance.sealBet(0x94011c67bc1e6448ed4b8682047358ca6cd09470, 2, salt1, { from: accounts[2] })
            .then( res => {
                //console.log("other b) ", res);
                assert.equal(res, expected, "sealBelt(player, number, salt) result should be as expected when passing account address as 0xfff...");
                return res;
            }),
            */

            instance.sealBet("0x94011c67bc1e6448ed4b8682047358ca6cd09470", 2, salt1, { from: accounts[2] })
            .then( res => {
                //console.log("other b) ", res);
                assert.equal(res, expected, 'sealBelt(player, number, salt) result should be as expected when passing account address as "0xfff..." ');
                return res;
            }),
        ]); // Promise.all()
    });// should be possible to seal a bet for someone else

});
