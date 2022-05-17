import {ActionDetail} from "../../domain/models/ia"
import {delay} from "./utility"
import {IAPort} from "../../domain/ports"
import {ActionEvent, GameViewInterface, PositionSelectionEvent} from "../models/types"
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
            const positionEvent = new PositionSelectionEvent(detail.position!)
            if (detail.type === "move") {
                // We execute the move
                return state
                    .handleEvent(new ActionEvent("move"))
                    .then(moveSelectionState => delay(moveSelectionState, this.delayDuration))
                    .then(moveSelectionState => moveSelectionState.handleEvent(positionEvent))
            } else if (detail.type === "attack" && detail.action) {
                // We execute the attack
                return state
                    .handleEvent(new ActionEvent("attack"))
                    .then(actionTargetSelectionState => delay(actionTargetSelectionState, this.delayDuration))
                    .then(actionTargetSelectionState => actionTargetSelectionState.handleEvent(positionEvent))
                    .then(actionPreviewedState => delay(actionPreviewedState, this.delayDuration))
                    .then(actionPreviewedState => actionPreviewedState.handleEvent(positionEvent))
                    .then(() => handleAction(state, details))
            } else {
                // We can't do anything with this kind of action, so we proceed to the next one
                return handleAction(state, details)
            }
        } else {
            return state.handleEvent(new ActionEvent("end"))
        }
    }
}