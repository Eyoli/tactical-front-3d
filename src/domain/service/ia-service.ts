import {GamePort, IAPort} from "../ports"
import {Game} from "../model/game"
import {ActionDetail, ActionType, Turn} from "../model/ia"
import {GameService} from "./game-service"
import {Position2D, Position3D, Unit} from "../model/types"
import {Weapon} from "../model/weapons"

const gamePort: GamePort = new GameService()

const isPositionWithinWeaponRange = (weapon: Weapon, game: Game, pUnit: Position3D, pTarget: Position3D) => {
    const d = game.world.distanceBetween(pTarget, pUnit)
    return d >= weapon.range.min && d <= weapon.range.max
}

const getFirstTargetWithinRange = (unit: Unit, accessiblePositions: Position3D[], game: Game, potentialTargets: Unit[]): Unit | undefined => potentialTargets
    .find((target) => {
        const pUnit = game.getState(target).position
        return accessiblePositions.findIndex(isPositionWithinWeaponRange.bind(null, unit.weapon, game, pUnit)) > -1
    })
/**
 * We look for a valid target. First we try to find a target within weapon range, else we take the first possible target
 * @param unit
 * @param accessiblePositions
 * @param target
 * @param game
 */
const getClosestPositionToTarget = (unit: Unit, accessiblePositions: Position3D[], target: Unit, game: Game): Position3D => {

    // If we find a target, we find the closest accessible position to it
    return accessiblePositions
        .map(p => ({
            d: game.world.distanceBetween(p, game.getState(target).position),
            p
        }))
        .reduce((previous, current) => {
            return previous?.d && previous?.d < current.d ? previous : current
        }).p
}

export class IAService implements IAPort {

    computeBestTurnActions(game: Game, unit: Unit): Turn {
        const accessiblePositions = gamePort.getReachablePositions(game, unit)

        const potentialTargets = game.getPotentialTargets(unit)
        const target = getFirstTargetWithinRange(unit, accessiblePositions, game, potentialTargets) || potentialTargets.find(() => true)

        switch (unit.type) {
            case "warrior":
            case "archer":
                const actions: ActionDetail[] = []
                if (target) {
                    const p = getClosestPositionToTarget(unit, accessiblePositions, target, game)
                    actions.push({type: "move" as ActionType, position: {x: p.x, z: p.z} as Position2D})

                    const pTarget = game.getState(target).position
                    if (isPositionWithinWeaponRange(unit.weapon, game, p, pTarget)) {
                        actions.push({type: "attack", target})
                    }
                }

                return {
                    actions: actions.values()
                }
        }
    }
}