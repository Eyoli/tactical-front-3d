import {Action, Unit} from "../../../domain/models/types";
import {CancelEvent, GameInputEvent, GameViewInterface, PositionSelectionEvent, STATES} from "../types";
import {GameState} from "../game-state";
import {NothingSelectedState} from "./nothing-selected";
import {Game} from "../../../domain/models/game";
import {UnitSelectedState} from "./unit-selected";

export class ActionPreviewedState extends GameState {
    constructor(
        game: Game,
        gameView: GameViewInterface,
        private readonly selectedUnit: Unit,
        private readonly selectedAction: Action,
    ) {
        super(game, gameView, STATES.ACTION_PREVIEWED)
    }

    handleEvent = (event: GameInputEvent): Promise<GameState> => {
        if (event instanceof CancelEvent) {
            this.gameView.unselect()
            return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
        }

        if (event instanceof PositionSelectionEvent) {
            console.log("Action executed", this.selectedAction, event.position)

            const actionResult = this.game.executeAction(this.selectedAction, event.position)
            const unitState = this.game.getState(this.selectedUnit)
            return this.gameView.executeAction(this.selectedUnit, unitState, actionResult, event.position)
                .then(() => new UnitSelectedState(this.game, this.gameView, this.selectedUnit))
        }

        return Promise.resolve(this)
    }
}



