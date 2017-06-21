var lupi = artifacts.require("./Lupi.sol");
var lupiManager = artifacts.require("./LupiManager.sol");

module.exports = function(deployer) {
    deployer.deploy(lupi, 1000000000000000000, 3, 60, 10000)
    .then( () => {
        return lupiManager.deployed();
    }).then( instance => {
        instance.addGame(lupi.address);
    });

};
