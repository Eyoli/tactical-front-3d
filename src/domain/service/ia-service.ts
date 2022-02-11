import {GamePort, IAPort} from "../ports"
import {Game} from "../model/game"
import {ActionType, Turn} from "../model/ia"
import {GameService} from "./game-service"
import {Position3D, Unit} from "../model/types"

const gamePort: GamePort = new GameService()

/**
 * We look for a valid target. First we try to find a target within weapon range, else we take the first possible target
 * @param game
 * @param accessiblePositions
 * @param unit
 */
const getClosestPositionInRangeAmongTargets = (unit: Unit, accessiblePositions: Position3D[], game: Game) => {
    const targets = game.getActivePotentialTargets()

    const target = targets
        .map((target) => {
            const pUnit = game.getState(target).position
            const pInRange = accessiblePositions.find((p) => {
                const d = game.world.distanceBetween(p, pUnit)
                return d >= unit.weapon.range.min && d <= unit.weapon.range.max
            })
        }).find(() => true) || targets.find(() => true)

    // If we find a target, we find the closest accessible position to it
    return target && accessiblePositions
        .map(p => ({d: game.world.distanceBetween(p, game.getState(target).position), p}))
        .reduce((previous, current) => {
            return previous?.d && previous?.d < current.d ? previous : current
        }).p
}

export class IAService implements IAPort {

    computeBestTurnActions(game: Game, unit: Unit): Turn {
        const positions = gamePort.getReachablePositions(game, unit)

        switch (unit.type) {
            case "warrior":
            case "archer":
                const position = getClosestPositionInRangeAmongTargets(unit, positions, game)
                const actions = []
                position && actions.push({type: "move" as ActionType, target: position})
                return {
                    actions: actions.values()
                }
        }
    }
}