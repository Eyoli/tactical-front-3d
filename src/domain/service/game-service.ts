import {Action, ActionResult, Position2D, Position3D, Unit, UnitState} from "../model/types"
import {ACTION_CANNOT_REACH_TARGET, UNIT_CANNOT_MOVE, UNIT_CANNOT_REACH_POSITION} from "../model/errors"
import {BowMotion} from "../algorithm/trajectory"
import {Game} from "../model/game"
import {WorldMapService} from "./world-map-service"
import {EdgeFilter} from "../algorithm/path-finder"
import {GamePort} from "../ports"

const worldMapService: WorldMapService<Position3D, number> = new WorldMapService()

const isAccessible = (p2D: Position2D, p3Ds: Position3D[]) => p3Ds.find(p => p.x === p2D.x && p.z === p2D.z)

const edgeFilter = (vMax: number, occupied: Position3D[]): EdgeFilter<Position3D> => (p1, p2) => !occupied.find(p => p.x === p2.x && p.z === p2.z)
    && Math.abs(p2.y - p1.y) <= vMax

export class GameService implements GamePort {

    moveUnit = (game: Game, unit: Unit, p: Position2D) => {
        const {getReachablePositions, getPosition} = this

        // Verify that the unit can move
        if (!game.getState(unit).canMove) {
            throw new Error(UNIT_CANNOT_MOVE)
        }

        const from = getPosition(game, unit)
        const to = game.world.getPosition3D(p)

        // Verify that the position can be accessed
        if (!isAccessible(p, getReachablePositions(game, unit))) {
            throw new Error(UNIT_CANNOT_REACH_POSITION)
        }

        const pathFinder = worldMapService.getShortestPath(game.world, from, to, edgeFilter(unit.jump, game.getPositions()))
        const result = pathFinder.find()
        if (result.path) {
            const lastState = game.getState(unit)
            game.getStates(unit).push(lastState.moveTo(to))
        }
        return result.path
    }

    getReachablePositions = (game: Game, unit: Unit): Position3D[] => {
        const {getPosition} = this

        let p = getPosition(game, unit)
        return worldMapService.getAccessibleNodes(
            game.world,
            p,
            1,
            unit.moves,
            edgeFilter(unit.jump, game.getPositions()))
    }

    getReachablePositionsForAction = (game: Game, action: Action, start?: Position3D): Position3D[] => {
        const {getPosition} = this

        // If start is not specified, or if we can't find source unit position, we stop here
        let p = start ?? getPosition(game, action.source)

        return worldMapService.getNodesAccessibleByFlight(
            game.projectileWorldMap,
            p,
            action.range.min,
            action.range.max,
            edgeFilter(action.range.vMax, []))
    }

    getPosition = (game: Game, unit: Unit): Position3D => {
        const p = game.getState(unit)?.position
        if (!p) throw new Error(`Unit (id=${unit.id}) without position`)
        return p
    }

    previewAction = (game: Game, action: Action, p: Position2D): ActionResult => {
        const {computeTrajectory, getReachablePositionsForAction} = this

        // Verify that the action can be triggered
        if (!isAccessible(p, getReachablePositionsForAction(game, action))) {
            throw new Error(ACTION_CANNOT_REACH_TARGET)
        }

        const trajectory = computeTrajectory(game, action, game.world.getPosition3D(p))
        const reachTarget = !trajectory || trajectory.reachTarget
        const newStates = new Map<Unit, UnitState>()
        if (reachTarget) {
            game.getUnits([p])
                .forEach(unit => newStates.set(unit, action.modify(game.getState(unit))))
        }
        newStates.set(action.source, (newStates.get(action.source) || game.getState(action.source)).act())
        return {newStates, trajectory}
    }

    executeAction = (game: Game, action: Action, p: Position2D): ActionResult => {
        const {previewAction} = this
        const actionResult = previewAction(game, action, p)
        actionResult.newStates.forEach((newState, unit) => game.getStates(unit).push(newState))
        return actionResult
    }

    private computeTrajectory = (game: Game, action: Action, to: Position3D) => {
        if (!action.trajectory) return undefined

        const from = game.getState(action.source).position

        if (action.trajectory === 'bow') {
            return new BowMotion(game, action, from, to)
        }

        return undefined
    }
}
