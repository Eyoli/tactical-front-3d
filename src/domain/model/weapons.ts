import {GRAVITATIONAL_FORCE_EQUIVALENT} from "../algorithm/trajectory"

type TrajectoryType = 'bow'
export type Weapon = {
    range: Range
    power: number
    area: number
    trajectory?: TrajectoryType
}

export type Range = {
    min: number
    max: number
    vMax: number
}

export const FISTS: (power: number) => Weapon = (power) => ({range: {min: 1, max: 1, vMax: 1}, power, area: 1})
export const BOW: (min: number, max: number, power: number) => Weapon = (min, max, power) => ({
    range: {min, max, vMax: max * max / (2 * GRAVITATIONAL_FORCE_EQUIVALENT)},
    power: 1,
    area: 1,
    trajectory: 'bow'
})