import {FISTS, Range, Weapon} from "./weapons"
import {ProjectileMotion} from "../algorithm/trajectory"

export type Position3D = {
    x: number
    y: number
    z: number
}

export type Position2D = {
    x: number
    z: number
}

export type UnitType = 'warrior' | 'archer'

type UnitInitializer = {
    id: number
    type: UnitType
    name: string
    moves: number
    jump: number
    hp: number
    weapon?: Weapon
}

export class Unit {
    readonly id: number
    readonly type: UnitType
    readonly name: string
    readonly moves: number
    readonly jump: number
    readonly hp: number
    weapon: Weapon

    constructor(initializer: UnitInitializer) {
        this.id = initializer.id
        this.type = initializer.type
        this.name = initializer.name
        this.moves = initializer.moves
        this.jump = initializer.jump
        this.hp = initializer.hp
        this.weapon = initializer.weapon ?? FISTS(1)
    }
}

export type Player = {
    id: number
    name: string
    color: string
    mode: 'human' | 'ia'
}

type UnitStateProps = {
    readonly hp: number
    readonly position: Position3D
    readonly canMove: boolean
    readonly canAct: boolean
    readonly dead: boolean
}

export class UnitState {
    readonly hp: number
    readonly position: Position3D
    readonly canMove: boolean
    readonly canAct: boolean
    readonly dead: boolean

    private constructor({hp, position, canMove, canAct, dead}: UnitStateProps) {
        this.hp = hp
        this.position = position
        this.canMove = canMove
        this.canAct = canAct
        this.dead = dead
    }

    static init = (unit: Unit, position: Position3D) => new UnitState({
        hp: unit.hp,
        position,
        canMove: false,
        canAct: false,
        dead: false,
    })

    moveTo = (position: Position3D) => new UnitState({
        hp: this.hp,
        position,
        canMove: false,
        canAct: this.canAct,
        dead: this.dead
    })

    act = () => new UnitState({
        hp: this.hp,
        position: this.position,
        canMove: this.canMove,
        canAct: false,
        dead: this.dead
    })

    modify = (dhp: number) => new UnitState({
        hp: this.hp + dhp,
        position: this.position,
        canMove: this.canMove,
        canAct: this.canAct,
        dead: this.dead || this.hp + dhp <= 0
    })

    startTurn = () => new UnitState({
        hp: this.hp,
        position: this.position,
        canMove: true,
        canAct: true,
        dead: this.dead
    })

    endTurn = () => new UnitState({
        hp: this.hp,
        position: this.position,
        canMove: false,
        canAct: false,
        dead: this.dead
    })
}

export type TrajectoryType = 'bow' | 'gun'

export interface Action {
    modify(target: UnitState): UnitState

    get source(): Unit

    get range(): Range

    get trajectory(): TrajectoryType | undefined
}

export class AttackAction implements Action {
    readonly source: Unit

    constructor(source: Unit) {
        this.source = source
    }

    get range() {
        return this.source.weapon.range
    }

    get trajectory() {
        return this.source.weapon.trajectory
    }

    modify = (target: UnitState): UnitState => target.modify(-this.source.weapon.power)
}

export type ActionResult = {
    newStates: Map<Unit, UnitState>
    trajectory?: ProjectileMotion
}