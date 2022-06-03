import {ActionDetail} from "../../domain/models/ia"
import {ActionEvent, PositionSelectionEvent} from "./types"
import {GameState} from "./game-state";
import {GameManager} from "./game-manager";
import {delay} from "./utility";

export class IAManager {

    private active = false

    constructor(
        private readonly gameManager: GameManager,
        private readonly delayBetweenActions: number,
    ) {
    }

    handleTurn = async (actionsDetails: IterableIterator<ActionDetail>) => {
        this.active = true
        return this.handleActions(actionsDetails)
            .then(() => {
                this.active = false
            })
    }

    isActive = () => this.active

    private handleActions = async (details: IterableIterator<ActionDetail>): Promise<GameState> => {
        const {gameManager, handleActions} = this
        const itResult = details.next()
        if (!itResult.done) {
            const detail = itResult.value
            const positionEvent = new PositionSelectionEvent(detail.position!)
            if (detail.type === "move") {
                // We execute the move
                return gameManager
                    .handleEvent(new ActionEvent("move"))
                    .then(moveSelectionState => delay(moveSelectionState, this.delayBetweenActions))
                    .then(() => gameManager.handleEvent(positionEvent))
            } else if (detail.type === "attack" && detail.action) {
                // We execute the attack
                return gameManager
                    .handleEvent(new ActionEvent("attack"))
                    .then(actionTargetSelectionState => delay(actionTargetSelectionState, this.delayBetweenActions))
                    .then(() => gameManager.handleEvent(positionEvent))
                    .then(actionPreviewedState => delay(actionPreviewedState, this.delayBetweenActions))
                    .then(() => gameManager.handleEvent(positionEvent))
                    .then(() => handleActions(details))
            } else {
                // We can't do anything with this kind of action, so we proceed to the next one
                return handleActions(details)
            }
        } else {
            return gameManager.handleEvent(new ActionEvent("end"))
        }
    }
}