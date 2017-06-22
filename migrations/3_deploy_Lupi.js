var lupi = artifacts.require("./Lupi.sol");
var lupiManager = artifacts.require("./LupiManager.sol");

module.exports = function(deployer, network) {
    console.log("network: ", network);
    if (network == "development" ) {
        console.log("Migration running on '" + network + "' network. \x1b[32mDeploying a test lupi instance.\x1b[0m");
        deployer.deploy(lupi, 1000000000000000000, 3, 60, 20000)
        .then( () => {
            return lupiManager.deployed();
        }).then( instance => {
            instance.addGame(lupi.address);
        });
    } else {
        console.log("Migration running on '" + network + "' network'. \x1b[31mNOT deploying lupi instance.\x1b[0m");
    }

};
