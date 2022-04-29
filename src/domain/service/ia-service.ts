import {IAPort} from "../ports"
import {Game} from "../model/game"
import {ActionDetail, ActionType, Turn} from "../model/ia"
import {AttackAction, Position2D, Position3D, Unit} from "../model/types"
import {Weapon} from "../model/weapons"
import {BowMotion} from "../algorithm/trajectory";

const isPositionWithinWeaponRange = (weapon: Weapon, game: Game, pUnit: Position3D, pTarget: Position3D) => {
    const d = game.world.distanceBetween(pTarget, pUnit)
    return d >= weapon.range.min && d <= weapon.range.max && Math.abs(pUnit.y - pTarget.y) <= weapon.range.vMax
}

const getFirstTargetWithinRange = (unit: Unit, accessiblePositions: Position3D[], game: Game, potentialTargets: Unit[]): Unit | undefined => potentialTargets
    .find((target) => {
        const targetState = game.getState(target)
        return !targetState.dead && accessiblePositions.findIndex(isPositionWithinWeaponRange.bind(null, unit.weapon, game, targetState.position)) > -1
    })
/**
 * We look for a valid target. First we try to find a target within weapon range, else we take the first possible target
 * @param unit
 * @param accessiblePositions
 * @param target
 * @param game
 */
const getClosestPositionToTarget = (unit: Unit, accessiblePositions: Position3D[], target: Unit, game: Game): Position3D => {

    const pTarget = game.getState(target).position

    if (accessiblePositions.length === 0) throw new Error("No accessible position available")

    // If we find a target, we find the closest accessible position to it
    return accessiblePositions
        .map(p => ({
            d: game.world.distanceBetween(p, pTarget),
            withinWeaponRange: isPositionWithinWeaponRange(unit.weapon, game, p, pTarget),
            p
        }))
        .reduce((previous, current) => {
            if (previous?.withinWeaponRange) {
                return previous
            }
            if (previous?.d && previous.d - unit.weapon.range.max > 0) {
                return (previous.d < current.d) ? previous : current
            }
            if (previous?.d && previous.d - unit.weapon.range.min < 0) {
                return (previous.d && previous?.d > current.d) ? previous : current
            }
            return current
        }).p
}

export class IAService implements IAPort {

    computeBestTurnActions(game: Game, unit: Unit): Turn {
        const accessiblePositions = game.getReachablePositions(unit)

        const potentialTargets = game.getPotentialTargets(unit)
        const target = getFirstTargetWithinRange(unit, accessiblePositions, game, potentialTargets) || potentialTargets.find(() => true)

        switch (unit.type) {
            case "warrior":
            case "archer":
                const details: ActionDetail[] = []
                if (target) {
                    const pTarget = game.getState(target).position
                    let pUnit = game.getState(unit).position

                    // If we can't reach our target, we try to move closer
                    if (accessiblePositions.length > 0 && !isPositionWithinWeaponRange(unit.weapon, game, pUnit, pTarget)) {
                        pUnit = getClosestPositionToTarget(unit, accessiblePositions, target, game)
                        details.push({type: "move" as ActionType, position: {x: pUnit.x, z: pUnit.z} as Position2D})
                    }

                    // If we can reach our target (with or without moving toward it), we attack it
                    if (isPositionWithinWeaponRange(unit.weapon, game, pUnit, pTarget)) {
                        const action = new AttackAction(unit)
                        const reachTarget = (action.trajectory === "bow") ? new BowMotion(game, action, pUnit, pTarget).reachTarget : true
                        if (reachTarget) {
                            details.push({
                                type: "attack",
                                action,
                                position: {x: pTarget.x, z: pTarget.z},
                            })
                        }
                    }
                }

                return {
                    actions: details.values()
                }
        }
    }
}