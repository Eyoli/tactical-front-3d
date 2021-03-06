import {AttackAction, Unit} from "../../../domain/models/types";
import {ActionEvent, GameInputEvent, GameViewInterface, STATES, UnitSelectionEvent} from "../types";
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

    private handleActionEvent = (event: ActionEvent) => {
        if (event.action === "move") {
            console.log('Displaying move range')

            const reachablePositions = this.game.getReachablePositions(this.selectedUnit)
            this.gameView.selectMoveAction(this.selectedUnit, reachablePositions)
            return Promise.resolve(new MoveSelectionState(this.game, this.gameView, this.selectedUnit))
        }
        if (event.action === "attack") {
            const action = new AttackAction(this.selectedUnit)
            console.log('Displaying action range', action)

            const reachablePositions = this.game.getReachablePositionsForAction(action)
            this.gameView.selectAction(this.selectedUnit, reachablePositions)
            return Promise.resolve(new ActionTargetSelectionState(this.game, this.gameView, this.selectedUnit, action))
        }
        if (event.action === "end") {
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