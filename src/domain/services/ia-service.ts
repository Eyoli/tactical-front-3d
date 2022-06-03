import {IAPort} from "../ports"
import {Game} from "../models/game"
import {ActionDetail, ActionType, Turn} from "../models/ia"
import {Unit} from "../models/types"
import {BowMotion} from "../algorithm/trajectory";
import {AttackAction} from "../models/actions";
import {getPositionWithinRangeOrClosestToTarget, getFirstTargetWithinRange, isPositionWithinWeaponRange} from "../algorithm/utility";

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
                    if (accessiblePositions.length > 0 && !isPositionWithinWeaponRange(unit.weapon, game.world, pUnit, pTarget)) {
                        pUnit = getPositionWithinRangeOrClosestToTarget(accessiblePositions, pTarget, unit.weapon, game)
                        details.push({
                            type: "move" as ActionType,
                            position: {x: pUnit.x, y: pUnit.y, z: pUnit.z}
                        })
                    }

                    // If we can reach our target (with or without moving toward it), we attack it
                    if (isPositionWithinWeaponRange(unit.weapon, game.world, pUnit, pTarget)) {
                        const action = new AttackAction(unit)
                        const reachTarget = (action.trajectory === "bow") ? new BowMotion(game, action, pUnit, pTarget).reachTarget : true
                        if (reachTarget) {
                            details.push({
                                type: "attack",
                                action,
                                position: {x: pTarget.x, y: pTarget.y, z: pTarget.z},
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