import {GameInputEvent, GameViewInterface, PositionSelectionEvent, STATES, UnitSelectionEvent} from "../types";
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

    handleEvent = (event: GameInputEvent): Promise<GameState> => {
        if (event instanceof UnitSelectionEvent) {
            if (this.selectedUnit === event.unit) {
                this.gameView.unselect()
                return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
            }
            return Promise.resolve(this)
        }

        if (event instanceof PositionSelectionEvent) {
            console.log(`Moving unit (id=${this.selectedUnit.id}) to`, event.position)

            // Verify that a path exists between the locations
            const path = this.game.moveUnit(this.selectedUnit, event.position)
            if (!path) {
                return Promise.reject(`Impossible to move unit (id=${this.selectedUnit.id}) to ${event.position} : no path found`)
            }

            return this.gameView.moveSelectedUnitAlong(this.selectedUnit, this.game.getState(this.selectedUnit), path)
                .then(() => new UnitSelectedState(this.game, this.gameView, this.selectedUnit))
        }

        return Promise.resolve(this)
    }
}