import {Player, Position2D, Position3D, Unit, UnitState} from "./types"
import {
    ACTION_CANNOT_REACH_TARGET,
    NO_ACTIVE_PLAYER,
    PLAYER_NOT_ADDED_BEFORE_UNIT,
    UNIT_CANNOT_MOVE,
    UNIT_CANNOT_REACH_POSITION,
    UNIT_WITHOUT_STATE
} from "./errors"
import {BowMotion} from "../algorithm/trajectory";
import {EdgeFilter} from "../algorithm/path-finder";
import {WorldMap} from "./world-map";
import {Action, ActionResult} from "./actions";

const last = <T>(array: T[]): T => array[array.length - 1]

type GameInit = Map<Player, Map<Unit, Position3D>>

export class GameBuilder {
    private readonly units: Unit[] = []
    private readonly players: Player[] = []
    private readonly playersUnits = new Map<Player, Map<Unit, Position3D>>()

    constructor(readonly world: WorldMap) {
    }

    addPlayers = (...players: Player[]) => {
        this.players.push(...players)
        players.forEach(player => this.playersUnits.set(player, new Map<Unit, Position3D>()))
        return this
    }

    addUnit = (newUnit: Unit, p: Position2D, player: Player) => {
        const {world, playersUnits, units} = this
        const playerUnits = playersUnits.get(player)
        if (!playerUnits) {
            throw new Error(PLAYER_NOT_ADDED_BEFORE_UNIT)
        }

        units.push(newUnit)
        playerUnits.set(newUnit, world.getHeighestPosition(p))
        return this
    }

    start = () => {
        const {world, units, playersUnits} = this
        return new Game(world, units, playersUnits)
    }
}

export class Game {
    private readonly unitsState = new Map<Unit, UnitState[]>()
    readonly playersUnits = new Map<Player, Unit[]>()
    private readonly unitPlayer = new Map<Unit, Player>()
    private activeUnitIndex: number = 0

    constructor(
        readonly world: WorldMap,
        readonly units: Unit[],
        gameInit: GameInit
    ) {
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

    getPosition = (unit: Unit) => {
        const p = this.getState(unit)?.position
        if (!p) throw new Error(`Unit (id=${unit.id}) without position`)
        return p
    }

    moveUnit = (unit: Unit, p: Position2D) => {
        const {world, getReachablePositions, getPosition} = this

        // Verify that the unit can move
        if (!this.getState(unit).canMove) {
            throw new Error(UNIT_CANNOT_MOVE)
        }

        const from = getPosition(unit)
        const to = world.getHeighestPosition(p)

        // Verify that the position can be accessed
        if (!isAccessible(p, getReachablePositions(unit))) {
            throw new Error(UNIT_CANNOT_REACH_POSITION)
        }

        const pathFinder = world.getShortestPath(from, to, edgeFilter(unit.jump, this.getPositions()))
        const result = pathFinder.find()
        if (result.path) {
            const lastState = this.getState(unit)
            this.getStates(unit).push(lastState.moveTo(to))
        }
        return result.path
    }

    previewAction = (action: Action, target: Position2D): ActionResult => {
        const {getReachablePositionsForAction, getState, getUnits} = this

        // Verify that the action can be triggered
        if (!isAccessible(target, getReachablePositionsForAction(action))) {
            throw new Error(ACTION_CANNOT_REACH_TARGET)
        }

        const trajectory = computeTrajectory(this, action, this.world.getHeighestPosition(target))
        const reachTarget = !trajectory || trajectory.reachTarget
        const newStates = new Map<Unit, UnitState>()
        if (reachTarget) {
            getUnits([target])
                .forEach(unit => newStates.set(unit, action.modify(getState(unit))))
        }
        newStates.set(action.source, (newStates.get(action.source) || getState(action.source)).act())
        return {newStates, trajectory}
    }

    executeAction = (action: Action, target: Position2D): ActionResult => {
        const {previewAction, getStates} = this
        const actionResult = previewAction(action, target)
        actionResult.newStates.forEach((newState, unit) => getStates(unit).push(newState))
        return actionResult
    }

    getReachablePositionsForAction = (action: Action, start?: Position3D) => {
        const {world, getPosition} = this

        // If start is not specified, or if we can't find source unit position, we stop here
        let p = start ?? getPosition(action.source)

        return world.getNodesAccessibleByFlight(
            p,
            action.range.min,
            action.range.max,
            edgeFilter(action.range.vMax, []))
    }

    getReachablePositions = (unit: Unit) => {
        const {world, getPosition, getPositions} = this

        let p = getPosition(unit)
        return world.getAccessibleNodes(
            p,
            1,
            unit.moves,
            edgeFilter(unit.jump, getPositions()))
    }

    private getUnits = (positions: Position2D[]): Unit[] => {
        const {units, getState} = this
        return units.filter(unit => {
            const unitPosition = getState(unit).position
            if (!unitPosition) return false
            return positions.find(p => unitPosition.x === p.x && unitPosition.z === p.z)
        })
    }
}

const isAccessible = (p2D: Position2D, p3Ds: Position3D[]) => p3Ds.find(p => p.x === p2D.x && p.z === p2D.z)

const edgeFilter = (vMax: number, occupied: Position3D[]): EdgeFilter<Position3D> => (p1, p2) => !occupied.find(p => p.x === p2.x && p.z === p2.z)
    && Math.abs(p2.y - p1.y) <= vMax

const computeTrajectory = (game: Game, action: Action, to: Position3D) => {
    if (!action.trajectory) return undefined

    const from = game.getState(action.source).position

    if (action.trajectory === 'bow') {
        return new BowMotion(game, action, from, to)
    }

    return undefined
}