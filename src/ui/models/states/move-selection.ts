import {GameViewInterface, STATES, Target} from "../types";
import {GameState} from "../game-state";
import {NothingSelectedState} from "./nothing-selected";
import {Game} from "../../../domain/models/game";
import {Unit} from "../../../domain/models/types";
import {UnitSelectedState} from "./unit-selected";

export class MoveSelectionState extends GameState {

    constructor(
        game: Game,
        gameView: GameViewInterface,
        private readonly selectedUnit: Unit
    ) {
        super(game, gameView, STATES.MOVE_SELECTION)
    }

    clickOnTarget = (target: Target): Promise<GameState> => {
        if (target.position) {
            if (this.selectedUnit === target.unit) {
                this.gameView.unselect()
                return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
            } else {
                console.log(`Moving unit (id=${this.selectedUnit.id}) to`, target.position)

                // Verify that a path exists between the locations
                const path = this.game.moveUnit(this.selectedUnit, target.position)
                if (!path) {
                    return Promise.reject(`Impossible to move unit (id=${this.selectedUnit.id}) to ${target.position} : no path found`)
                }

                return this.gameView.moveSelectedUnitAlong(this.selectedUnit, this.game.getState(this.selectedUnit), path)
                    .then(() => new UnitSelectedState(this.game, this.gameView, this.selectedUnit))
            }
        }
        return Promise.resolve(this)
    }
}