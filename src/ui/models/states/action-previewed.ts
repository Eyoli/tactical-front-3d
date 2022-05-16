import {Action, Unit} from "../../../domain/models/types";
import {GameViewInterface, STATES, Target} from "../types";
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

    clickOnTarget = (target: Target): Promise<GameState> => {
        if (target.unit && target.position) {
            if (this.selectedUnit === target.unit) {
                this.gameView.unselect()
                return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
            } else {
                console.log("Action executed", this.selectedAction, target.position)

                const actionResult = this.game.executeAction(this.selectedAction, target.position)
                const unitState = this.game.getState(this.selectedUnit)
                return this.gameView.executeAction(this.selectedUnit, unitState, actionResult, target.position)
                    .then(() => new UnitSelectedState(this.game, this.gameView, this.selectedUnit))
            }
        }
        return Promise.reject()
    }
}



