import {Unit} from "../../../domain/models/types";
import {ActionEvent, GameInputEvent, GameViewInterface, STATES, UnitSelectionEvent} from "../types";
import {GameState} from "../game-state";
import {NothingSelectedState} from "./nothing-selected";
import {MoveSelectionState} from "./move-selection";
import {ActionTargetSelectionState} from "./action-target-selection";
import {Game} from "../../../domain/models/game";
import {AttackAction} from "../../../domain/models/actions";

export class UnitSelectedState extends GameState {

    constructor(
        game: Game,
        gameView: GameViewInterface,
        readonly selectedUnit: Unit,
    ) {
        super(game, gameView, STATES.UNIT_SELECTED)
    }

    handleEvent = (event: GameInputEvent): Promise<GameState> => {
        if (event instanceof UnitSelectionEvent) {
            if (event.unit === this.selectedUnit) {
                this.gameView.unselect()
                return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
            }
            return Promise.resolve(this)
        }

        if (event instanceof ActionEvent) {
            return this.handleActionEvent(event)
        }

        return Promise.resolve(this)
    }

    private handleActionEvent = (event: ActionEvent): Promise<GameState> => {
        switch (event.action) {
            case "move":
                console.log('Displaying move range')
                const reachablePositions = this.game.getReachablePositions(this.selectedUnit)
                this.gameView.selectMoveAction(this.selectedUnit, reachablePositions)
                return Promise.resolve(new MoveSelectionState(this.game, this.gameView, this.selectedUnit))
            case "attack":
                const action = new AttackAction(this.selectedUnit)
                console.log('Displaying action range', action)
                const reachablePositionsForAction = this.game.getReachablePositionsForAction(action)
                this.gameView.selectAction(this.selectedUnit, reachablePositionsForAction)
                return Promise.resolve(new ActionTargetSelectionState(this.game, this.gameView, this.selectedUnit, action))
            case "end":
                this.game.nextTurn()
                const activeUnit = this.game.getActiveUnit()
                this.gameView.unselect()
                this.gameView.select(activeUnit, this.game.getState(activeUnit).position)
                return Promise.resolve(new UnitSelectedState(this.game, this.gameView, activeUnit))
        }
        return Promise.resolve(this)
    }
}