var lupiManager = artifacts.require("./LupiManager.sol");

module.exports = function(deployer) {
    deployer.deploy(lupiManager);
};
