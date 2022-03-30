import {UnitView} from "./units"
import {ActionDetail} from "../../domain/model/ia"
import {delay} from "./utility"
import {GameScene} from "./game-scene"
import {IAPort} from "../../domain/ports"
import {IAService} from "../../domain/service/ia-service"
import {Target} from "./types"
import {AttackAction} from "../../domain/model/types"

const iaPort: IAPort = new IAService()

export class IAManager {
    constructor(private readonly gameScene: GameScene) {
    }

    handleTurn = (unitView: UnitView) => {
        const {game} = this.gameScene
        const turn = iaPort.computeBestTurnActions(game, unitView.unit)
        this.handleAction(unitView, turn.actions)
    }

    private handleAction = (unitView: UnitView, actions: IterableIterator<ActionDetail>) => {
        const {gameScene, handleAction} = this
        const {game} = gameScene
        const itResult = actions.next()
        if (!itResult.done) {
            const action = itResult.value
            if (action.type === "move") {
                // We execute the move
                gameScene.handleUnitMove(action.position!, () => this.handleAction(unitView, actions))
            } else if (action.type === "attack" && action.target) {
                // We execute the attack
                const targetUnitView = gameScene.getUnitViewFromUnit(action.target)
                const target: Target = {
                    object: targetUnitView.mesh,
                    position: game.getState(action.target).position,
                    unitView: targetUnitView
                }
                const attackAction = new AttackAction(unitView.unit)
                gameScene.handleActionSelection(unitView, attackAction)
                delay(gameScene.delay)
                    .then(() => gameScene.previewUnitAction(target))
                    .then(() => delay(gameScene.delay))
                    .then(() => gameScene.executeUnitAction(target, () => this.handleAction(unitView, actions)))
            } else {
                // We can't do anything with this kind of action, so we proceed to the next one
                handleAction(unitView, actions)
            }
        } else {
            gameScene.endTurn()
        }
    }
}