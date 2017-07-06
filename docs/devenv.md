# Lupi dev environment & deploy
## Prerequisites
* [Ethereum CLI](https://www.ethereum.org/cli)
* [nodejs](https://nodejs.org/en/download/)
* [node version manager](https://github.com/tj/n): `npm install -g n`
  * install 8.1.0 for testrpc:  `n 8.1.0` (TODO: decide on node version to be used)
* [lupi repo](https://github.com/DecentLabs/ethereum-lupi):
```
git clone --recursive https://github.com/DecentLabs/ethereum-lupi.git
cd ethereum-lupi
npm install
cd ethereum-bridge
npm install
```
* [testrpc](https://github.com/ethereumjs/testrpc) (global install): `npm run testrpc:install`
* [truffle](http://truffleframework.com/docs/getting_started/installation) (global install): `npm run truffle:install`

## Deploy to testprc
```
npm run testrpc:start
npm run bridge:deploy
npm run truffle:migrate
npm run dev
```
Note: use `npm run bridge:start` or `npm run bridge:latest` to launch bridge again when bridge contracts are alredy deployed.

* Optional: An improved and customized [Ethereum explorer fork](https://github.com/szerintedmi/explorer)

## Deploy to privatechain
### Create privatechain (first time)
```
cd privatechain
./createprivechain.sh
./importprivatekeys.sh
```
### Deploy to privatechain
```
cd privatechain
./runprivatechain.sh
```
to deploy all contracts: in new terminal, from ethereum-lupi root folder:
```
npm run bridge:deploy
truffle migrate --reset
```
or to deploy only a new LupiManager:
```
truffle migrate -f 2
```
## Deploy to Ropsten testnet
```
geth --testnet --rpc --rpcapi db,eth,net,web3,personal --cache=1024  --rpcport 8545 --rpcaddr 127.0.0.1 --rpccorsdomain "*" --bootnodes "enode://20c9ad97c081d63397d7b685a412227a40e23c8bdc6688c6f37e97cfbc22d2b4d1db1510d8f61e6a8866ad7f0e17c02b14182d37ea7c3c8b9c2683aeb6b733a1@52.169.14.227:30303,enode://6ce05930c72abc632c58e2e4324f7c7ea478cec0ed4fa2528982cf34483094e9cbc9216e7aa349691242576d552a2a56aaeae426c5303ded677ce455ba1acd9d@13.84.180.240:30303" --unlock 0
```
in new terminal, from ethereum-lupi root folder:
```
truffle migrate --reset
```
to redeploy only LupiManager:
```
truffle migrate -f 2
```
FE build & deploy:
```
npm run build
cp -r build/* <your web root>
```

TODO:
 * improve/automate build & deploy
 * geth testnet commandline security check (`--unlock 0` vs. ``--rpccorsdomain "*"``)
 * dockerize privatechain (Dockerfiles + docker-compose config)
 * Could we connect to INFURA with `geth`? So we wouldn't need to wait for testnet to sync before every deploy

# Testing
`truffle test`  
make sure you are:
* running testrpc with_ `npm run testrpc:start` or
* private chain with `cd privatechain;  ./runprivatechain.sh`  
  _Note: some tests are failing on privatechain (see [issues](https://github.com/DecentLabs/ethereum-lupi/issues)) and it runs for ages_
