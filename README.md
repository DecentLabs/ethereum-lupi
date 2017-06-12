# LUPI - Lowest Unique Positive Integer game

_a project by_ ![DECENT](http://www.decent.org/images/logo-voronoi_120x33.png)

Play a game where each player sends one positive integer in a game round, with a fixed 'bet' amount. The player who sends a unique and smallest number wins the pot. This means if two people happen to send the same number, then the third one gets all the bets regardless the other two number were smaller.
If there is no winner (ie. there is no unique number in the round) then all players get back their bet.  
What number would you put if you were to play this game?

NOTE: It's a work in progress project. Contribution, code review and suggestions are welcome!

## Game Mechanics
1. The round starts when the contract is deployed
1. Players submit their guess: a positive integer number for the round. A pre-defined guess amount is included to have a stake in the game. The bet number is encrypted (sealed) with the player's private key (only known by the player).
1. When the game reaches the predefined number of bets then the round stops accepting further bets.
1. Players reveal (unseal) their bets with their private key.
1. When the pre-defined reveal period is over then anyone can initiate the round close. The winner is the player who picked the lowest number that nobody else has picked.
1. At game close the organizer takes a pre-defined fee.
1. After round close the winner can claim the pot (less organiser fee).
1. If there is no winner (ie. there were no unique number) then everyone can claim back their bets (less organiser fee)

## Technical implementation
<TODO>

## Dev environment
### Prerequisites
* [Ethereum CLI](https://www.ethereum.org/cli)
* [nodejs](https://nodejs.org/en/download/)
* [node version manager](https://github.com/tj/n): `npm install -g n`
  * install 8.1.0 for testrpc:  `n 8.1.0` (TODO: decide on node version to be used)
* [lupi repo](https://github.com/DecentLabs/ethereum-lupi):
```
git clone --recursive https://github.com/DecentLabs/ethereum-lupi.git
cd ethereum-lupi
npm install
```
* [testrpc](https://github.com/ethereumjs/testrpc) (global install): `npm run testrpc:install`
* [truffle](http://truffleframework.com/docs/getting_started/installation) (global install): `npm run truffle:install`

### Compile & deploy & run
#### on testprc
```
npm run testrpc:start
npm run truffle:migrate
npm run dev
```

* Optional: An improved and customized [Ethereum explorer fork](https://github.com/szerintedmi/explorer)

TODO:
 * When contract .sol changed then testrcp need to be restarted. Truffle migrate won't deploy the new version.
 * dockerize (Dockerfiles + docker-compose config)

## Testing
`truffle test` (work in progress)

## Authors
![DECENT](http://www.decent.org/images/logo-voronoi_120x33.png)

[DECENT Labs](http://www.decent.org) production

###Concept, initial version
* [phraktle](https://github.com/phraktle)
* [szerintedmi](https://github.com/szerintedmi)

## Licence
This project is licensed under the GNU General Public License v3.0 license - see the [LICENSE](LICENSE) file for details.
