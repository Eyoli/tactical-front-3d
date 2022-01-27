import {GamePort, IAPort} from "../ports"
import {Game} from "../model/game"
import {Turn} from "../model/ia"
import {GameService} from "./game-service"

const gamePort: GamePort = new GameService()

export class IAService implements IAPort {

    computeBestTurnActions(game: Game): Turn {
        const activeUnit = game.getActiveUnit()
        const positions = gamePort.getReachablePositions(game, activeUnit)
        const allies = game.getActivePlayerUnits()

        return {
            actions: [],
            actionsDetails: []
        }
    }

}