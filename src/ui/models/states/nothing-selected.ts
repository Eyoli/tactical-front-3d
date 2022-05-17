import {GameInputEvent, GameViewInterface, STATES, UnitSelectionEvent} from "../types";
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

    handleEvent = (event: GameInputEvent): Promise<GameState> => {
        if (event instanceof UnitSelectionEvent) {
            this.gameView.select(event.unit, this.game.getState(event.unit).position)
            return Promise.resolve(new UnitSelectedState(this.game, this.gameView, event.unit))
        }
        return Promise.resolve(this)
    }
}