import {GamePort, IAPort} from "../ports"
import {Game} from "../model/game"
import {Turn} from "../model/ia"
import {GameService} from "./game-service"
import {Unit} from "../model/types"

const gamePort: GamePort = new GameService()

export class IAService implements IAPort {

    computeBestTurnActions(game: Game, unit: Unit): Turn {
        const positions = gamePort.getReachablePositions(game, unit)
        const allies = game.getActivePlayerUnits()

        return {
            actions: [{
                type: 'move',
                target: positions[Math.floor(Math.random() * (positions.length - 0.0001))]
            }]
        }
    }

}