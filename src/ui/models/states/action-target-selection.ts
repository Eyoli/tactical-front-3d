import {Action, Unit} from "../../../domain/models/types";
import {GameViewInterface, STATES, Target} from "../types";
import {GameState} from "../game-state";
import {ActionPreviewedState} from "./action-previewed";
import {Game} from "../../../domain/models/game";
import {NothingSelectedState} from "./nothing-selected";

export class ActionTargetSelectionState extends GameState {

    constructor(
        game: Game,
        gameView: GameViewInterface,
        private readonly selectedUnit: Unit,
        private readonly selectedAction: Action,
    ) {
        super(game, gameView, STATES.ACTION_TARGET_SELECTION)
    }

    clickOnTarget = (target: Target): Promise<GameState> => {
        if (target.unit && target.position) {
            if (this.selectedUnit === target.unit) {
                this.gameView.unselect()
                return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
            } else {
                const actionResult = this.game.previewAction(this.selectedAction, target.position)
                console.log("Action previewed", actionResult)

                const state = this.game.getState(this.selectedUnit)
                this.gameView.previewAction(this.selectedUnit, state, actionResult, target.position)
                return Promise.resolve(new ActionPreviewedState(this.game, this.gameView, this.selectedUnit, this.selectedAction))
            }
        }
        return Promise.resolve(this)
    }
}