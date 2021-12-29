import {EdgeFilter} from "../algorithm/path-finder"
import {WorldMapService} from "../service/services"
import {WorldMap} from "./world-map"
import Immutable from "immutable"

export type Position3D = {
    x: number
    y: number
    z: number
}

export type Position2D = {
    x: number
    z: number
}

export type Unit = {
    id: number
    moves: number
    jump: number
}

export type Player = {
    id: number
    name: string
    color: string
}

const edgeFilter = (unit: Unit, occupied: Position3D[]): EdgeFilter<Position3D> => (p1, p2) => !occupied.find(p => p.x === p2.x && p.z === p2.z)
    && Math.abs(p2.y - p1.y) <= unit.jump

const worldMapService: WorldMapService<Position3D, number> = new WorldMapService()

export class World {
    private readonly _units: Unit[] = []
    private readonly _players: Player[] = []
    private readonly _playersUnits = new Map<Player, Unit[]>()
    private readonly unitsPosition = new Map<number, Position3D>()

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
        this.unitsPosition.set(unit.id, {
            x: p.x,
            y: this.worldMap.getHeight(p.x, p.z),
            z: p.z
        })
        units.push(unit)

        return this
    }

    moveUnit = (unit: Unit, {x, z}: Position2D) => {
        const from = this.unitsPosition.get(unit.id)
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
        const pathFinder = worldMapService.getShortestPath(this.worldMap, from, to, edgeFilter(unit, this.getUnitPositions()))
        const result = pathFinder.find()
        if (result.path) {
            this.unitsPosition.set(unit.id, to)
        }
        return result.path
    }

    getClosestPosition = ({x, z}: Position2D): Position2D => {
        return {x: Math.floor(x), z: Math.floor(z)}
    }

    getAccessiblePositions = (unit: Unit): Position3D[] => {
        const {unitsPosition, worldMap} = this

        let p = unitsPosition.get(unit.id)
        // If we can't find unit position, we stop here
        if (!p) return []

        return worldMapService.getAccessibleNodes(
            worldMap,
            p,
            unit.moves,
            edgeFilter(unit, this.getUnitPositions()))
    }

    getPosition = (unit: Unit) => this.unitsPosition.get(unit.id)

    private getUnitPositions = () => Array.from(this.unitsPosition.values())
}