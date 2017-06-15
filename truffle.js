// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
    networks: {

        development: {
            host: 'localhost',
            port: 8545,
            network_id: '*' // Match any network id
        },

        ropsten: {
            host: "https://ropsten.infura.io",
            port: 80,
            network_id: 3,
            from: "0x38b2Bf18cd9F802a4a6265De0410282a768e0945"
            // optional config values:
            // gas
            // gasPrice
            // from - default address to use for any transaction Truffle makes during migrations
            // provider - web3 provider instance Truffle should use to talk to the Ethereum network.
            //          - if specified, host and port are ignored.
        }
    }
}
