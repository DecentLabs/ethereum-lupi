var lupiManager = artifacts.require("./LupiManager.sol");

contract("LupiManager tests", accounts => {

    it('should be possible to add a game', () => {
        var instance, gameIdx;
        var gameToAdd = "0x2313bdf7f88755aa2c6198af3dd875622a181213";
        return lupiManager.new().then( res => {
            instance = res;
            return instance.addGame(gameToAdd);
        }).then( tx => {
            gameIdx = tx.logs[0].args.gameIdx;
            assert.equal(tx.logs[0].event, "e_GameAdded", "e_GameAdded event should be emmitted");
            assert.equal(tx.logs[0].args.gameIdx, 0, "gameIdx should be set in event");
            assert.equal(tx.logs[0].args.gameAddress, gameToAdd, "new game address should be set in event");
            return instance.games(gameIdx);
        }).then ( res => {
            assert.equal(res, gameToAdd, "new game should be added");
            return instance.getGamesCount();
        }).then ( res => {
            assert.equal(res, 1, "game count should be 1");
        });
    }); // should be possible to add a game

    it('only owner should be able to add a game', () => {
        var instance;
        var gameToAdd = "0x2313bdf7f88755aa2c6198af3dd875622a181213";
        return lupiManager.new().then( res => {
            instance = res;
            return instance.addGame(gameToAdd, { from: accounts[1]});
        }).then( tx => {
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.getGamesCount();
        }).then ( res => {
            assert.equal(res, 0, "game count should be 0");
        });
    }); // only owner should be able to add a game

    it('should be possible to change owner', () => {
        var newOwner = accounts[1];
        var res, ownerAddress;
        return lupiManager.new().then( res => {
            instance = res;
            return instance.owner();
        }).then( res => {
            ownerAddress = res;
            return instance.setOwner(newOwner, { from: ownerAddress })
        }).then( tx => {
            assert.equal(tx.logs[0].event, "NewOwner", "NewOwner event should be emmitted");
            assert.equal(tx.logs[0].args.old, ownerAddress, "old owner should be set in event");
            assert.equal(tx.logs[0].args.current, newOwner, "new owner should be set in event");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, newOwner, "owner() should return the new owner");
            ownerAddress = newOwner;
        });
    }); // should be possible to change owner

    it('should only the current owner change owner', () => {
        var newOwner = accounts[2];
        var res, ownerAddress;
        return lupiManager.new().then( res => {
            instance = res;
            return instance.owner();
        }).then( res => {
            ownerAddress = res;
            return instance.setOwner(newOwner, { from: newOwner })
        }).then( tx => {
            assert.equal(tx.logs.length, 0, "no event should be emmitted");
            return instance.owner();
        }).then ( ownerRes => {
            assert.equal(ownerRes, ownerAddress, "owner() should return the old owner");
        });
    }); // should be possible to change owner

});
