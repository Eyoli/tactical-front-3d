import {Unit} from "../../../domain/models/types";
import {GameInputEvent, GameViewInterface, PositionSelectionEvent, STATES, UnitSelectionEvent} from "../types";
import {GameState} from "../game-state";
import {ActionPreviewedState} from "./action-previewed";
import {Game} from "../../../domain/models/game";
import {NothingSelectedState} from "./nothing-selected";
import {Action} from "../../../domain/models/actions";

export class ActionTargetSelectionState extends GameState {

    constructor(
        game: Game,
        gameView: GameViewInterface,
        private readonly selectedUnit: Unit,
        private readonly selectedAction: Action,
    ) {
        super(game, gameView, STATES.ACTION_TARGET_SELECTION)
    }

    handleEvent = (event: GameInputEvent): Promise<GameState> => {
        if (event instanceof UnitSelectionEvent) {
            if (this.selectedUnit === event.unit) {
                this.gameView.unselect()
                return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
            }
            return Promise.resolve(this)
        }

        if (event instanceof PositionSelectionEvent) {
            const actionResult = this.game.previewAction(this.selectedAction, event.position)
            console.log("Action previewed", actionResult)

            const state = this.game.getState(this.selectedUnit)
            this.gameView.previewAction(state, actionResult, event.position)
            return Promise.resolve(new ActionPreviewedState(this.game, this.gameView, this.selectedUnit, this.selectedAction))
        }

        return Promise.resolve(this)
    }
}