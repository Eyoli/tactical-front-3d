import {EdgeFilter} from "../algorithm/path-finder"
import {WorldMapService} from "../service/services"
import {WorldMap} from "./world-map"
import Immutable from "immutable"
import {Action, ActionResult, Player, Position2D, Position3D, Unit, UnitState} from "./types"
import {GRAVITATIONAL_FORCE_EQUIVALENT, ProjectileMotion} from "../algorithm/trajectory"
import {
    ACTION_CANNOT_REACH_TARGET,
    PLAYER_NOT_ADDED_BEFORE_UNIT,
    UNIT_CANNOT_MOVE,
    UNIT_CANNOT_REACH_POSITION,
    UNIT_WITHOUT_STATE
} from "./errors"

const edgeFilter = (vMax: number, occupied: Position3D[]): EdgeFilter<Position3D> => (p1, p2) => !occupied.find(p => p.x === p2.x && p.z === p2.z)
    && Math.abs(p2.y - p1.y) <= vMax

const last = <T>(array: T[]): T => array[array.length - 1]

const isAccessible = (p2D: Position2D, p3Ds: Position3D[]) => p3Ds.find(p => p.x === p2D.x && p.z === p2D.z)

const worldMapService: WorldMapService<Position3D, number> = new WorldMapService()

type GameInit = Map<Player, Map<Unit, Position3D>>

export class GameBuilder {
    private readonly units: Unit[] = []
    private readonly players: Player[] = []
    private readonly playersUnits = new Map<Player, Map<Unit, Position3D>>()

    constructor(readonly worldMap: WorldMap) {
    }

    addPlayers = (...players: Player[]) => {
        this.players.push(...players)
        players.forEach(player => this.playersUnits.set(player, new Map<Unit, Position3D>()))
        return this
    }

    addUnit = (newUnit: Unit, p: Position2D, player: Player) => {
        const {worldMap, playersUnits, units} = this
        const playerUnits = playersUnits.get(player)
        if (!playerUnits) {
            throw new Error(PLAYER_NOT_ADDED_BEFORE_UNIT)
        }

        units.push(newUnit)
        playerUnits.set(newUnit, worldMap.getPosition3D(p))
        return this
    }

    start = () => {
        const {worldMap, units, playersUnits} = this
        return new Game(worldMap, new GameState(units, playersUnits))
    }
}

export class Game {

    constructor(
        readonly worldMap: WorldMap,
        private readonly gameState: GameState) {
    }

    get units() {
        return Immutable.List(this.gameState.units).toArray()
    }

    get playersUnits() {
        return Immutable.Map(this.gameState.playersUnits)
    }

    moveUnit = (unit: Unit, p: Position2D) => {
        const {worldMap, gameState, getReachablePositions, getPosition} = this

        // Verify that the unit can move
        if (!gameState.getState(unit).canMove) {
            throw new Error(UNIT_CANNOT_MOVE)
        }

        const from = getPosition(unit)
        const to = worldMap.getPosition3D(p)

        // Verify that the position can be accessed
        if (!isAccessible(p, getReachablePositions(unit))) {
            throw new Error(UNIT_CANNOT_REACH_POSITION)
        }

        const pathFinder = worldMapService.getShortestPath(this.worldMap, from, to, edgeFilter(unit.jump, gameState.getPositions()))
        const result = pathFinder.find()
        if (result.path) {
            const lastState = gameState.getState(unit)
            gameState.getStates(unit).push(lastState.moveTo(to))
        }
        return result.path
    }

    getClosestPosition = ({x, z}: Position2D): Position2D => {
        return {x: Math.floor(x), z: Math.floor(z)}
    }

    getReachablePositions = (unit: Unit): Position3D[] => {
        const {worldMap, gameState, getPosition} = this

        let p = getPosition(unit)
        return worldMapService.getAccessibleNodes(
            worldMap,
            p,
            1,
            unit.moves,
            edgeFilter(unit.jump, gameState.getPositions()))
    }

    getReachablePositionsForAction = (action: Action): Position3D[] => {
        const {worldMap, getPosition} = this

        // If we can't find unit position, we stop here
        let p = getPosition(action.source)

        return worldMapService.getAccessibleNodes(
            worldMap,
            p,
            action.range.min,
            action.range.max,
            edgeFilter(action.range.vMax, []))
    }

    getPosition = (unit: Unit): Position3D => {
        const p = this.gameState.getState(unit)?.position
        if (!p) throw new Error(`Unit (id=${unit.id}) without position`)
        return p
    }

    previewAction = (action: Action, p: Position2D): ActionResult => {
        const {gameState, computeTrajectory, getReachablePositionsForAction} = this

        // Verify that the action can be triggered
        if (!isAccessible(p, getReachablePositionsForAction(action))) {
            throw new Error(ACTION_CANNOT_REACH_TARGET)
        }

        const trajectory = computeTrajectory(action, p)
        const reachTarget = !trajectory || trajectory.reachTarget
        const newStates = new Map<Unit, UnitState>()
        if (reachTarget) {
            gameState.getUnits([p])
                .forEach(unit => newStates.set(unit, action.modify(gameState.getState(unit))))
        }
        return {newStates, trajectory}
    }

    private computeTrajectory = (action: Action, p: Position2D) => {
        const {worldMap, gameState, computeIntermediatePoints} = this

        if (!action.trajectory) return undefined

        const p0 = gameState.getState(action.source).position
        const p1 = worldMap.getPosition3D(p)
        const constraints = computeIntermediatePoints(action.source, p1, 3)
            .map((i) => ({
                x: worldMap.distanceBetween(p0, i),
                y: i.y - p0.y
            }))

        return new ProjectileMotion({
            p1: {x: worldMap.distanceBetween(p0, p1), y: p1.y - p0.y},
            alpha: {min: Math.PI / 6, max: Math.PI * 7 / 16, divisions: 5},
            v0Max: Math.sqrt(GRAVITATIONAL_FORCE_EQUIVALENT * action.range.max),
            constraints
        })
    }

    executeAction = (action: Action, p: Position2D) => {
        const {previewAction, gameState} = this
        previewAction(action, p).newStates.forEach((newState, unit) => gameState.getStates(unit).push(newState))
        gameState.getStates(action.source).push(gameState.getState(action.source).act())
    }

    computeIntermediatePoints = (unit: Unit, p1: Position3D, subdivisions: number) => {
        const {worldMap, gameState} = this
        const p0 = gameState.getState(unit).position
        const delta = Math.max(Math.abs(p1.z - p0.z), Math.abs(p1.x - p0.x))
        const dx = (p1.x - p0.x) / delta, dz = (p1.z - p0.z) / delta
        const points = []
        for (let i = 1; i < delta * subdivisions; i++) {
            const x = p0.x + i * dx / subdivisions
            const z = p0.z + i * dz / subdivisions
            const y = worldMap.getHeight(Math.round(x), Math.round((z)))
            points.push({x, y, z})
        }
        return points
    }

    endTurn = () => {
        const {gameState} = this
        gameState.nextTurn()
    }

    getState = this.gameState.getState

    getActiveUnit = this.gameState.getActiveUnit
}

class GameState {
    private readonly unitsState = new Map<Unit, UnitState[]>()
    readonly playersUnits = new Map<Player, Unit[]>()
    private activeUnitIndex: number = 0

    constructor(readonly units: Unit[], gameInit: GameInit) {
        gameInit.forEach(
            (unitsInit, player) => {
                this.playersUnits.set(player, Array.from(unitsInit.keys()))
                unitsInit.forEach(
                    (p, unit) => this.unitsState.set(unit, [UnitState.init(unit, p)]))
            })
        const activeUnit = this.getActiveUnit()
        const firstState = this.getState(activeUnit)
        this.getStates(activeUnit).shift()
        this.getStates(activeUnit).push(firstState.startTurn())
    }

    getActiveUnit = () => this.units[this.activeUnitIndex]

    getStates = (unit: Unit): UnitState[] => {
        const states = this.unitsState.get(unit)
        if (!states) throw new Error(UNIT_WITHOUT_STATE(unit))
        return states
    }

    getState = (unit: Unit): UnitState => {
        const states = this.getStates(unit)
        return states[states.length - 1]
    }

    getPositions = () => Array.from(this.unitsState.values()).map((states) => last(states).position)

    getUnits = (positions: Position2D[]): Unit[] => {
        const {units, getState} = this
        return units.filter(unit => {
            const unitPosition = getState(unit).position
            if (!unitPosition) return false
            return positions.find(p => unitPosition.x === p.x && unitPosition.z === p.z)
        })
    }

    nextTurn = () => {
        const activeUnit = this.getActiveUnit()
        this.getStates(activeUnit).push(this.getState(activeUnit).endTurn())
        this.activeUnitIndex = (this.activeUnitIndex + 1) % this.units.length
        const newActiveUnit = this.getActiveUnit()
        this.getStates(newActiveUnit).push(this.getState(newActiveUnit).startTurn())
    }
}