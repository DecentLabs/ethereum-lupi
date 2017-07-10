var lupiManager = artifacts.require("./LupiManager.sol");

module.exports = function(deployer, network) {
    deployer.deploy(lupiManager);
};
