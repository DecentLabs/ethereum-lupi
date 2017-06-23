# LUPI - Lowest Unique Positive Integer game

_a project by_ ![DECENT](http://www.decent.org/images/logo-voronoi_120x33.png)

Play a game where each player sends one positive integer, with a fixed 'bet' amount. The player who sends a unique and smallest number wins the pot. This means if two people happen to send the same number, then the third one gets all the bets regardless the other two number were smaller.
If there is no winner (ie. there is no unique number in the round) then all players get back their bet.  
What number would you put if you were to play this game?

NOTE: It's a work in progress project. Contribution, code review and suggestions are welcome!

## Examples
|       |Player A|Player B|Player C| Winner |
|-------|-------:|-------:|-------:|:-------:|
| game 1|      20|      10|      30|Player B|
| game 2|      10|      10|      30|Player C|
| game 3|      10|      10|      10|tied (all refunded)|
| game 4|      10|      10|dind't reveal|tied (all refunded)|

## Detailed Game Mechanics
1. A game starts when a game contract is deployed by the organiser
1. Players submit their guess: a positive integer number for the game.  
   * A pre-defined guess amount is included to have a stake in the game.
   * The bet number is encrypted (sealed) with a secret key.
   * the secret key only known by the player so they have to save it and keep it sage until the reveal period.
1. When the game reaches the predefined number of bets then the game stops accepting further bets.
1. Anyone can start the reveal phase
1. Players reveal (unseal) their tickets with their secret key.
1. When the pre-defined length reveal period is over then anyone can initiate the game close (declare winner).  
The winner is the player who picked the lowest number that nobody else has picked.
1. At game close the organizer takes a pre-defined fee.
1. After game close anyone can initiate a payout for the winner
1. If there is no winner (ie. there were no unique number) then everyone can claim back their bets one by one (less organiser fee)

## Technical implementation
TODO

### [Development environment](docs/devenv.md)


## Authors
![DECENT](http://www.decent.org/images/logo-voronoi_120x33.png)

[DECENT Labs](http://www.decent.org) production

###Concept, initial version
* [phraktle](https://github.com/phraktle)
* [szerintedmi](https://github.com/szerintedmi)

## Licence
This project is licensed under the GNU General Public License v3.0 license - see the [LICENSE](LICENSE) file for details.
