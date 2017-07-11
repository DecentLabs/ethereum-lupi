// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
    networks: {

        development: {
            host: 'localhost',
            port: 8545,
            network_id: 999, // set in runtesrpc.sh
            gas: 4707806
        },

        privatechain: {
            host: 'localhost',
            port: 8545,
            network_id: 1976, // set in privatechain/runprivatechain.sh
            gas: 4707806
        },

        ropstenLocal: { // when running with runropsten.sh
            host: 'localhost',
            port: 8545,
            network_id: 3,
            gas: 4707806
        },


        ropstenInfura: {
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
