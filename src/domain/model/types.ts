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
    weapon?: Weapon
}

export class Unit {
    readonly id: number
    readonly name: string
    readonly moves: number
    readonly jump: number
    weapon: Weapon

    constructor(initializer: UnitInitializer) {
        this.id = initializer.id
        this.name = initializer.name
        this.moves = initializer.moves
        this.jump = initializer.jump
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

export type UnitState = {
    position: Position3D
}

export type Action = {
    name: string
    children: Action[]
}