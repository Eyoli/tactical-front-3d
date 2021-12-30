import {EdgeFilter} from "../algorithm/path-finder"
import {WorldMapService} from "../service/services"
import {WorldMap} from "./world-map"
import Immutable from "immutable"
import {Player, Position2D, Position3D, Unit, UnitState} from "./types"

const edgeFilter = (vMax: number, occupied: Position3D[]): EdgeFilter<Position3D> => (p1, p2) => !occupied.find(p => p.x === p2.x && p.z === p2.z)
    && Math.abs(p2.y - p1.y) <= vMax

const worldMapService: WorldMapService<Position3D, number> = new WorldMapService()

export class World {
    private readonly _units: Unit[] = []
    private readonly _players: Player[] = []
    private readonly _playersUnits = new Map<Player, Unit[]>()
    private readonly unitsState = new Map<number, UnitState[]>()

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

    addUnit = (unit: Unit, p: Position2D, player: Player) => {
        const units = this._playersUnits.get(player)
        if (!units) {
            throw new Error("Add the player before adding a unit")
        }

        this._units.push(unit)
        this.unitsState.set(unit.id, [{
            position:
                {
                    x: p.x,
                    y: this.worldMap.getHeight(p.x, p.z),
                    z: p.z
                }
        }])
        units.push(unit)

        return this
    }

    moveUnit = (unit: Unit, {x, z}: Position2D) => {
        const {getPosition} = this
        const from = getPosition(unit)
        // No current position for the selected unit, we do nothing
        if (!from) {
            console.log("No starting point")
            return null
        }

        const to = {
            x: x,
            y: this.worldMap.getHeight(x, z),
            z: z
        }
        const pathFinder = worldMapService.getShortestPath(this.worldMap, from, to, edgeFilter(unit.jump, this.getUnitPositions()))
        const result = pathFinder.find()
        if (result.path) {
            this.unitsState.get(unit.id)?.push({position: to})
        }
        return result.path
    }

    getClosestPosition = ({x, z}: Position2D): Position2D => {
        return {x: Math.floor(x), z: Math.floor(z)}
    }

    getReachablePositions = (unit: Unit): Position3D[] => {
        const {worldMap, getPosition} = this

        let p = getPosition(unit)
        // If we can't find unit position, we stop here
        if (!p) return []

        return worldMapService.getAccessibleNodes(
            worldMap,
            p,
            1,
            unit.moves,
            edgeFilter(unit.jump, this.getUnitPositions()))
    }

    getReachablePositionsForWeapon = (unit: Unit): Position3D[] => {
        const {worldMap, getPosition} = this

        // If we can't find unit position, we stop here
        let p = getPosition(unit)
        if (!p) return []

        return worldMapService.getAccessibleNodes(
            worldMap,
            p,
            unit.weapon.range.min,
            unit.weapon.range.max,
            edgeFilter(unit.weapon.range.vMax, this.getUnitPositions()))
    }

    getPosition = (unit: Unit) => this.getState(unit)?.position

    getState = (unit: Unit) => {
        const states = this.unitsState.get(unit.id)
        if (!states) {
            return undefined
        }
        return states[states.length - 1]
    }

    private getUnitPositions = () => Array.from(this.unitsState.values()).map(states => states[states.length - 1].position)
}