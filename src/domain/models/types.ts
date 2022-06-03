import {FISTS, Weapon} from "./weapons"

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
    readonly unit: Unit
    readonly hp: number
    readonly position: Position3D
    readonly canMove: boolean
    readonly canAct: boolean
    readonly dead: boolean
}

export class UnitState {
    readonly unit: Unit
    readonly hp: number
    readonly position: Position3D
    readonly canMove: boolean
    readonly canAct: boolean
    readonly dead: boolean

    private constructor({unit, hp, position, canMove, canAct, dead}: UnitStateProps) {
        this.unit = unit
        this.hp = hp
        this.position = position
        this.canMove = canMove
        this.canAct = canAct
        this.dead = dead
    }

    static init = (unit: Unit, position: Position3D) => new UnitState({
        unit,
        hp: unit.hp,
        position,
        canMove: false,
        canAct: false,
        dead: false,
    })

    private copy = (changes: {
        unit?: Unit,
        hp?: number,
        position?: Position3D,
        canMove?: boolean,
        canAct?: boolean,
        dead?: boolean
    }) => {
        return new UnitState({
            unit: changes.unit || this.unit,
            hp: changes.hp || this.hp,
            position: changes.position || this.position,
            canMove: (changes.canMove !== undefined) ? changes.canMove : this.canMove,
            canAct: (changes.canAct !== undefined) ? changes.canAct : this.canAct,
            dead: (changes.dead !== undefined) ? changes.dead : this.dead,
        })
    }

    moveTo = (position: Position3D) => this.copy({
        position,
        canMove: false,
    })

    act = () => this.copy({
        canAct: false,
    })

    modify = (dhp: number) => this.copy({
        hp: this.hp + dhp,
        dead: this.dead || this.hp + dhp <= 0
    })

    startTurn = () => this.copy({
        canMove: true,
        canAct: true,
    })

    endTurn = () => this.copy({
        canMove: false,
        canAct: false,
    })
}

export type TrajectoryType = 'bow' | 'gun'