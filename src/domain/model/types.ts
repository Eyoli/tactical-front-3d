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

type UnitInitializer = {
    id: number
    name: string
    moves: number
    jump: number
    hp: number
    weapon?: Weapon
}

export class Unit {
    readonly id: number
    readonly name: string
    readonly moves: number
    readonly jump: number
    readonly hp: number
    weapon: Weapon

    constructor(initializer: UnitInitializer) {
        this.id = initializer.id
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
}

export class UnitState {
    readonly hp: number
    readonly position: Position3D
    readonly canMove: boolean
    readonly canAct: boolean

    private constructor({hp, position, canMove, canAct}: UnitStateProps) {
        this.hp = hp
        this.position = position
        this.canMove = canMove
        this.canAct = canAct
    }

    static init = (unit: Unit, position: Position3D) => new UnitState({
        hp: unit.hp,
        position,
        canMove: false,
        canAct: false
    })

    moveTo = (position: Position3D) => new UnitState({hp: this.hp, position, canMove: false, canAct: this.canAct})

    act = () => new UnitState({hp: this.hp, position: this.position, canMove: this.canMove, canAct: false})

    modify = (dhp: number) => new UnitState({
        hp: this.hp + dhp,
        position: this.position,
        canMove: this.canMove,
        canAct: this.canAct
    })

    startTurn = () => new UnitState({hp: this.hp, position: this.position, canMove: true, canAct: true})

    endTurn = () => new UnitState({hp: this.hp, position: this.position, canMove: false, canAct: false})
}

export interface Action {
    modify(target: UnitState): UnitState

    get source(): Unit

    get range(): Range

    get trajectory(): string | undefined
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