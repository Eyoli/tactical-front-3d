import {EdgeFilter} from "../algorithm/path-finder"
import {WorldMapService} from "../service/services"
import {WorldMap} from "./world-map"
import Immutable from "immutable"
import {Action, ActionResult, Player, Position2D, Position3D, Unit, UnitState} from "./types"
import {GRAVITATIONAL_FORCE_EQUIVALENT, ProjectileMotion} from "../algorithm/trajectory"

const edgeFilter = (vMax: number, occupied: Position3D[]): EdgeFilter<Position3D> => (p1, p2) => !occupied.find(p => p.x === p2.x && p.z === p2.z)
    && Math.abs(p2.y - p1.y) <= vMax

const last = <T>(array: T[]): T => array[array.length - 1]

const isAccessible = (p2D: Position2D, p3Ds: Position3D[]) => p3Ds.find(p => p.x === p2D.x && p.z === p2D.z)

const worldMapService: WorldMapService<Position3D, number> = new WorldMapService()

export class World {
    private readonly _units: Unit[] = []
    private readonly _players: Player[] = []
    private readonly _playersUnits = new Map<Player, Unit[]>()
    private readonly unitsState = new Map<Unit, UnitState[]>()

    readonly worldMap: WorldMap

    constructor(worldMap: WorldMap) {
        this.worldMap = worldMap
    }

    get units() {
        return Immutable.List(this._units).toArray()
    }

    get playersUnits() {
        return Immutable.Map(this._playersUnits)
    }

    addPlayers = (...players: Player[]) => {
        this._players.push(...players)
        players.forEach(player => this._playersUnits.set(player, []))
        return this
    }

    addUnits = (newUnits: Unit[], p: Position2D, player: Player) => {
        const {_playersUnits, _units, unitsState, getPosition3D} = this
        const playerUnits = _playersUnits.get(player)
        if (!playerUnits) {
            throw new Error("Add the player before adding a unit")
        }

        _units.push(...newUnits)
        playerUnits.push(...newUnits)
        newUnits.forEach(unit => unitsState.set(unit, [UnitState.init(unit, getPosition3D(p))]))

        return this
    }

    moveUnit = (unit: Unit, p: Position2D) => {
        const {getReachablePositions, getPosition, getPosition3D, getState} = this

        const from = getPosition(unit)
        const to = getPosition3D(p)

        // Verify that the position can be accessed
        if (!isAccessible(p, getReachablePositions(unit))) {
            throw new Error("Impossible to move unit")
        }

        const pathFinder = worldMapService.getShortestPath(this.worldMap, from, to, edgeFilter(unit.jump, this.getUnitPositions()))
        const result = pathFinder.find()
        if (result.path) {
            const lastState = getState(unit)
            this.unitsState.get(unit)?.push(lastState.to(to))
        }
        return result.path
    }

    getClosestPosition = ({x, z}: Position2D): Position2D => {
        return {x: Math.floor(x), z: Math.floor(z)}
    }

    getReachablePositions = (unit: Unit): Position3D[] => {
        const {worldMap, getPosition} = this

        let p = getPosition(unit)
        return worldMapService.getAccessibleNodes(
            worldMap,
            p,
            1,
            unit.moves,
            edgeFilter(unit.jump, this.getUnitPositions()))
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
        const p = this.getState(unit)?.position
        if (!p) throw new Error(`Unit (id=${unit.id}) without position`)
        return p
    }

    getState = (unit: Unit): UnitState => {
        const states = this.getStates(unit)
        return states[states.length - 1]
    }

    getUnits = (positions: Position2D[]): Unit[] => {
        const {units, getState} = this
        return units.filter(unit => {
            const unitPosition = getState(unit)?.position
            if (!unitPosition) return false
            return positions.find(p => unitPosition.x === p.x && unitPosition.z === p.z)
        })
    }

    previewAction = (action: Action, p: Position2D): ActionResult => {
        const {computeTrajectory, getUnits, getState, getReachablePositionsForAction} = this

        // Verify that the action can be triggered
        if (!isAccessible(p, getReachablePositionsForAction(action))) {
            throw new Error("Action impossible: target not in range")
        }

        const trajectory = computeTrajectory(action, p)
        const newStates = new Map<Unit, UnitState>()
        if (trajectory.reachTarget) {
            getUnits([p])
                .forEach(unit => newStates.set(unit, action.modify(getState(unit))))
        }
        return {newStates, trajectory}
    }

    private computeTrajectory = (action: Action, p: Position2D) => {
        const {worldMap, getState, getPosition3D, computeIntermediatePoints} = this

        const p0 = getState(action.source).position
        const p1 = getPosition3D(p)
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
        const {previewAction, getStates} = this
        previewAction(action, p).newStates.forEach((newState, unit) => getStates(unit).push(newState))
    }

    private getPosition3D = ({x, z}: Position2D) => ({
        x: x,
        y: this.worldMap.getHeight(x, z),
        z: z
    })

    private getStates = (unit: Unit): UnitState[] => {
        const states = this.unitsState.get(unit)
        if (!states) throw new Error(`Unit (id=${unit.id}) without state`)
        return states
    }

    private unitStates = () => Array.from(this.unitsState.values())

    private getUnitPositions = () => this.unitStates().map(states => last(states).position)

    computeIntermediatePoints = (unit: Unit, p1: Position3D, subdivisions: number) => {
        const p0 = this.getState(unit).position
        const delta = Math.max(Math.abs(p1.z - p0.z), Math.abs(p1.x - p0.x))
        const dx = (p1.x - p0.x) / delta, dz = (p1.z - p0.z) / delta
        const conditions = []
        for (let i = 1; i < delta * subdivisions; i++) {
            const x = p0.x + i * dx / subdivisions
            const z = p0.z + i * dz / subdivisions
            const y = this.worldMap.getHeight(Math.round(x), Math.round((z)))
            console.log(x, y, z)
            conditions.push({x, y, z})
        }
        return conditions
    }
}