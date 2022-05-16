import {AttackAction, Unit} from "../../../domain/models/types";
import {GameViewInterface, GUIAction, STATES, Target} from "../types";
import {GameState} from "../game-state";
import {NothingSelectedState} from "./nothing-selected";
import {MoveSelectionState} from "./move-selection";
import {ActionTargetSelectionState} from "./action-target-selection";
import {Game} from "../../../domain/models/game";
import {IAManager} from "../../threejs/ia";
import {IAService} from "../../../domain/services/ia-service";

export class UnitSelectedState extends GameState {

    private readonly iaManager = new IAManager(new IAService(), 500)

    constructor(
        game: Game,
        gameView: GameViewInterface,
        readonly selectedUnit: Unit
    ) {
        super(game, gameView, STATES.UNIT_SELECTED)
    }

    clickOnTarget = (target: Target): Promise<GameState> => {
        if (target?.unit && this.selectedUnit === target.unit) {
            this.gameView.unselect()
            return Promise.resolve(new NothingSelectedState(this.game, this.gameView))
        }
        return Promise.resolve(this)
    }

    triggerGUIAction = (guiAction: GUIAction): Promise<GameState> => {
        if (guiAction === "move") {
            console.log('Displaying move range')

            const reachablePositions = this.game.getReachablePositions(this.selectedUnit)
            this.gameView.selectMoveAction(this.selectedUnit, reachablePositions)
            return Promise.resolve(new MoveSelectionState(this.game, this.gameView, this.selectedUnit))
        }
        if (guiAction === "attack") {
            const action = new AttackAction(this.selectedUnit)
            console.log('Displaying action range', action)

            const reachablePositions = this.game.getReachablePositionsForAction(action)
            this.gameView.selectAction(this.selectedUnit, reachablePositions)
            return Promise.resolve(new ActionTargetSelectionState(this.game, this.gameView, this.selectedUnit, action))
        }
        if (guiAction === "end") {
            this.game.nextTurn()
            const activeUnit = this.game.getActiveUnit()
            const activePlayer = this.game.getActivePlayer()
            if (activePlayer.mode === "ia") {
                return this.iaManager.handleTurn(this.game, this.gameView)
            }
            this.gameView.unselect()

            this.gameView.select(activeUnit, this.game.getState(activeUnit).position)
            return Promise.resolve(new UnitSelectedState(this.game, this.gameView, activeUnit))
        }
        return Promise.resolve(this)
    }
}