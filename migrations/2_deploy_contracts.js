var lupi = artifacts.require("./lupi.sol");

module.exports = function(deployer) {
  deployer.deploy(lupi, 1000000000000000000, 2, 10000, 1440);
};
