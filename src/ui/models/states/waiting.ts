import {GameState} from "../game-state";
import {GameViewInterface, STATES} from "../types";
import {Game} from "../../../domain/models/game";

export class WaitingState extends GameState {

    constructor(
        game: Game,
        gameView: GameViewInterface,
    ) {
        super(game, gameView, STATES.WAITING);
    }
}