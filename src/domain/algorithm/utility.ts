import {Weapon} from "../models/weapons";
import {Game} from "../models/game";
import {Position3D, Unit} from "../models/types";
import {WorldMap} from "../models/world-map";

export const isPositionWithinWeaponRange = (weapon: Weapon, world: WorldMap, source: Position3D, target: Position3D) => {
    const d = world.distanceBetween(target, source)
    return d >= weapon.range.min && d <= weapon.range.max && Math.abs(source.y - target.y) <= weapon.range.vMax
}

export const getFirstTargetWithinRange = (unit: Unit, accessiblePositions: Position3D[], game: Game, potentialTargets: Unit[]): Unit | undefined => potentialTargets
    .find((target) => {
        const targetState = game.getState(target)
        return !targetState.dead && accessiblePositions.findIndex(isPositionWithinWeaponRange.bind(null, unit.weapon, game.world, targetState.position)) > -1
    })

/**
 * We look for a valid target. First we try to find a target within weapon range, else we take the first possible target
 */
export const getPositionWithinRangeOrClosestToTarget = (accessiblePositions: Position3D[], target: Position3D, weapon: Weapon, game: Game): Position3D => {

    if (accessiblePositions.length === 0) throw new Error("No accessible position available")

    // If we find a target, we find the closest accessible position to it
    return accessiblePositions
        .map(p => ({
            d: game.world.distanceBetween(p, target),
            withinWeaponRange: isPositionWithinWeaponRange(weapon, game.world, p, target),
            p
        }))
        .reduce((previous, current) => {
            if (previous?.withinWeaponRange) {
                return previous
            }
            if (previous?.d && previous.d - weapon.range.max > 0) {
                return (previous.d < current.d) ? previous : current
            }
            if (previous?.d && previous.d - weapon.range.min < 0) {
                return (previous.d && previous?.d > current.d) ? previous : current
            }
            return current
        }).p
}