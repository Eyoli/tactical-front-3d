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
        this.weapon = initializer.weapon ?? BARE_FISTS
    }
}

export type Weapon = {
    range: Range
    power: number
    area: number
}

export type Range = {
    min: number
    max: number
    vMax: number
}

export const BARE_FISTS: Weapon = {range: {min: 1, max: 1, vMax: 1}, power: 0, area: 1}

export type Player = {
    id: number
    name: string
    color: string
}

export class UnitState {
    readonly position: Position3D
    readonly hp: number

    private constructor(hp: number, position: Position3D) {
        this.position = position
        this.hp = hp
    }

    static init = (unit: Unit, position: Position3D) => new UnitState(unit.hp, position)

    to(position: Position3D) {
        return new UnitState(this.hp, position)
    }

    modify(dhp: number) {
        return new UnitState(this.hp + dhp, this.position)
    }
}

export interface Action {
    actUpon(target: UnitState): UnitState
}

export class AttackAction {
    private source: Unit

    constructor(source: Unit) {
        this.source = source
    }

    actUpon = (target: UnitState): UnitState => target.modify(-1)
}