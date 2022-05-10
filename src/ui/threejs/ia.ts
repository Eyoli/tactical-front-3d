import {UnitView} from "./units"
import {ActionDetail} from "../../domain/model/ia"
import {delay} from "./utility"
import {GameView} from "./game-view"
import {IAPort} from "../../domain/ports"
import {IAService} from "../../domain/service/ia-service"
import {Target} from "./types"
import {AttackAction} from "../../domain/model/types"

const iaPort: IAPort = new IAService()

export class IAManager {
    constructor(private readonly gameScene: GameView) {
    }

    handleTurn = (unitView: UnitView) => {
        const {game} = this.gameScene
        const turn = iaPort.computeBestTurnActions(game, unitView.unit)
        this.handleAction(unitView, turn.actions)
    }

    private handleAction = (unitView: UnitView, details: IterableIterator<ActionDetail>) => {
        const {gameScene, handleAction} = this
        const {game} = gameScene
        const itResult = details.next()
        if (!itResult.done) {
            const detail = itResult.value
            if (detail.type === "move") {
                // We execute the move
                gameScene.moveSelectedUnitTo(detail.position!)
                    .then(() => this.handleAction(unitView, details))
            } else if (detail.type === "attack" && detail.action) {
                // We execute the attack
                const target: Target = {
                    position: game.world.getHeighestPosition(detail.position),
                }
                const attackAction = new AttackAction(unitView.unit)
                gameScene.selectAction(unitView, attackAction)
                delay(gameScene.delay)
                    .then(() => gameScene.previewSelectedAction(target))
                    .then(() => delay(gameScene.delay))
                    .then(() => gameScene.executeSelectedAction(target))
                    .then(() => this.handleAction(unitView, details))
            } else {
                // We can't do anything with this kind of action, so we proceed to the next one
                handleAction(unitView, details)
            }
        } else {
            gameScene.endTurn()
        }
    }
}