import {ActionDetail} from "../../domain/models/ia"
import {delay} from "./utility"
import {IAPort} from "../../domain/ports"
import {GameViewInterface, Target} from "../models/types"
import {Game} from "../../domain/models/game";
import {NothingSelectedState} from "../models/states/nothing-selected";
import {GameState} from "../models/game-state";


export class IAManager {
    constructor(
        private readonly iaPort: IAPort,
        private readonly delayDuration: number,
    ) {
    }

    handleTurn = (game: Game, gameView: GameViewInterface) => {
        const activeUnit = game.getActiveUnit()
        const turn = this.iaPort.computeBestTurnActions(game, activeUnit)
        const initialState = new NothingSelectedState(game, gameView);
        return this.handleAction(initialState, turn.actions)
    }

    private handleAction = (state: GameState, details: IterableIterator<ActionDetail>): Promise<GameState> => {
        const {handleAction} = this
        const itResult = details.next()
        if (!itResult.done) {
            const detail = itResult.value
            if (detail.type === "move") {
                // We execute the move
                return state
                    .triggerGUIAction("move")
                    .then(moveSelectionState => delay(moveSelectionState, this.delayDuration))
                    .then(moveSelectionState => moveSelectionState.clickOnTarget({position: detail.position!}))
            } else if (detail.type === "attack" && detail.action) {
                // We execute the attack
                const target: Target = {
                    position: detail.position,
                }
                return state
                    .triggerGUIAction("attack")
                    .then(actionTargetSelectionState => delay(actionTargetSelectionState, this.delayDuration))
                    .then(actionTargetSelectionState => actionTargetSelectionState.clickOnTarget(target))
                    .then(actionPreviewedState => delay(actionPreviewedState, this.delayDuration))
                    .then(actionPreviewedState => actionPreviewedState.clickOnTarget(target))
                    .then(() => handleAction(state, details))
            } else {
                // We can't do anything with this kind of action, so we proceed to the next one
                return handleAction(state, details)
            }
        } else {
            return state.triggerGUIAction("end")
        }
    }
}