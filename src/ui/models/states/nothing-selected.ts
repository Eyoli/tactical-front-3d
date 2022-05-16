import {GameViewInterface, STATES, Target} from "../types";
import {GameState} from "../game-state";
import {UnitSelectedState} from "./unit-selected";
import {Game} from "../../../domain/models/game";

export class NothingSelectedState extends GameState {

    constructor(
        game: Game,
        gameView: GameViewInterface,
    ) {
        super(game, gameView, STATES.NOTHING_SELECTED);
    }

    override clickOnTarget = (target: Target): Promise<GameState> => {
        if (target.unit) {
            this.gameView.select(target.unit, this.game.getState(target.unit).position)
            return Promise.resolve(new UnitSelectedState(this.game, this.gameView, target.unit))
        }
        return Promise.resolve(this)
    }
}