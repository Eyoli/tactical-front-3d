import {ProjectileWorldMap, WorldMap} from "./world-map"
import {Player, Position2D, Position3D, Unit, UnitState} from "./types"
import {NO_ACTIVE_PLAYER, PLAYER_NOT_ADDED_BEFORE_UNIT, UNIT_WITHOUT_STATE} from "./errors"

const last = <T>(array: T[]): T => array[array.length - 1]

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
        return new Game(worldMap, units, playersUnits)
    }
}

export class Game {
    readonly projectileWorldMap: ProjectileWorldMap
    private readonly unitsState = new Map<Unit, UnitState[]>()
    readonly playersUnits = new Map<Player, Unit[]>()
    private readonly unitPlayer = new Map<Unit, Player>()
    private activeUnitIndex: number = 0

    constructor(
        readonly world: WorldMap,
        readonly units: Unit[], gameInit: GameInit) {
        this.projectileWorldMap = new ProjectileWorldMap(world)
        gameInit.forEach(
            (unitsInit, player) => {
                this.playersUnits.set(player, Array.from(unitsInit.keys()))
                unitsInit.forEach(
                    (p, unit) => {
                        this.unitsState.set(unit, [UnitState.init(unit, p)])
                        this.unitPlayer.set(unit, player)
                    })
            })
        const activeUnit = this.getActiveUnit()
        const firstState = this.getState(activeUnit)
        this.getStates(activeUnit).shift()
        this.getStates(activeUnit).push(firstState.startTurn())
    }

    getActiveUnit = () => this.units[this.activeUnitIndex]

    getActivePlayer = () => this.getPlayer(this.getActiveUnit())

    getPlayer = (unit: Unit) => {
        const activePlayer = this.unitPlayer.get(unit)
        if (!activePlayer) throw new Error(NO_ACTIVE_PLAYER)
        return activePlayer
    }

    getPotentialTargets = (unit: Unit) => {
        const player = this.getPlayer(unit)
        return Array.from(this.playersUnits.entries())
            .filter((entry) => entry[0] !== player)
            .map((entry) => entry[1])
            .reduce((previous: Unit[], current) => {
                const next = previous
                next.push(...current.filter(target => !this.getState(target).dead))
                return next
            }, [])
    }

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
        const {getActiveUnit, getStates, getState} = this
        const activeUnit = getActiveUnit()
        getStates(activeUnit).push(getState(activeUnit).endTurn())

        const numberOfTeamsAlive = Array.from(this.playersUnits.entries())
            .filter(value => value[1].find(unit => !getState(unit).dead) || false)
            .length
        if (numberOfTeamsAlive < 2) throw new Error("Game is over")

        let c = 0
        do {
            this.activeUnitIndex = (this.activeUnitIndex + 1) % this.units.length
            c++
        } while (c < this.units.length && this.getState(this.getActiveUnit()).dead)

        const newActiveUnit = this.getActiveUnit()
        this.getStates(newActiveUnit).push(this.getState(newActiveUnit).startTurn())
        console.log('New turn: ', this.getActiveUnit(), this.getActivePlayer())
    }
}