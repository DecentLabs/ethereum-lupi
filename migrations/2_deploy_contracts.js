var lupi = artifacts.require("./lupi.sol");

module.exports = function(deployer) {
  deployer.deploy(lupi, 1000000000000000000, 3, 60, 10000);
};
