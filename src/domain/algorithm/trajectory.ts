import {Game} from "../models/game"
import {Position3D, Unit} from "../models/types"
import {Action} from "../models/actions";

export const GRAVITATIONAL_FORCE_EQUIVALENT = 9.80665
type Position = { x: number, y: number }
type ProjectileMotionProblem = {
    // launch angle interval
    alpha: { min: number, max: number, divisions: number }
    // initial velocity constraints
    v0: { min: number, max: number }
    // start point
    p0?: Position
    // end point
    p1: Position,
    // minimal constraints for y
    constraints?: Position[]
}

export class ProjectileMotion {
    readonly V0x: number
    readonly V0y: number
    readonly T: number
    readonly G: number
    readonly x0: number
    readonly y0: number
    readonly reachTarget: boolean

    constructor({
                    p0: {x: x0, y: y0} = {x: 0, y: 0},
                    p1: {x: x1, y: y1},
                    alpha,
                    v0,
                    constraints = []
                }: ProjectileMotionProblem) {
        this.x0 = x0
        this.y0 = y0
        this.G = GRAVITATIONAL_FORCE_EQUIVALENT
        const R = x1 - x0, H = y1 - y0

        const alphas = new Array<number>(alpha.divisions).fill(0)
            .map((v, i) => alpha.min + i * (alpha.max - alpha.min) / (alpha.divisions - 1))

        // Check if there is a possible trajectory
        let i = 0, valid = false
        while (!valid && i < alpha.divisions) {
            valid = Math.tan(alphas[i]) > H / R
            i++
        }
        if (!valid) throw new Error("No trajectory possible")

        // Check mandatory height conditions if specified
        let constraintsCheck
        do {
            const V0 = Math.max(v0.min, Math.min(v0.max, Math.sqrt(this.G * R * R / (2 * (R * Math.tan(alphas[i]) - H))) / Math.cos(alphas[i])))
            this.V0x = V0 * Math.cos(alphas[i])
            this.V0y = V0 * Math.sin(alphas[i])

            constraintsCheck = constraints?.map(({x, y}) => {
                const Rc = x - x0
                const yc = y0 + Rc * Math.tan(alphas[i]) - this.G * Rc * Rc / (2 * this.V0x * this.V0x)
                return yc > y
            }) ?? []
            i++
        } while (!constraintsCheck.every(b => b) && i < alpha.divisions)
        const firstFailed = constraintsCheck.findIndex(b => !b)
        if (firstFailed > -1) {
            this.T = (constraints[firstFailed].x - x0) / this.V0x
            this.reachTarget = false
        } else {
            this.T = R / this.V0x
            this.reachTarget = true
        }
    }

    getPoint = (p: number) => {
        const {V0x, V0y, G, T, x0, y0} = this
        const t = p * T
        return {
            x: x0 + V0x * t,
            y: y0 + V0y * t - G * t * t / 2
        }
    }
}

export class BowMotion extends ProjectileMotion {
    constructor(game: Game, action: Action, from: Position3D, to: Position3D) {
        const V0Max = Math.sqrt(GRAVITATIONAL_FORCE_EQUIVALENT * action.range.max)

        const constraints = computeIntermediatePoints(game, action.source, to, 3)
            .map((i) => ({
                x: game.world.distanceBetween(from, i),
                y: i.y - from.y
            }))

        super({
            p1: {x: game.world.distanceBetween(from, to), y: to.y - from.y},
            alpha: {min: Math.PI / 6, max: Math.PI * 7 / 16, divisions: 5},
            v0: {min: 0, max: V0Max},
            constraints
        })
    }
}

const computeIntermediatePoints = (game: Game, unit: Unit, p1: Position3D, subdivisions: number) => {
    const p0 = game.getState(unit).position
    const delta = Math.max(Math.abs(p1.z - p0.z), Math.abs(p1.x - p0.x))
    const dx = (p1.x - p0.x) / delta, dz = (p1.z - p0.z) / delta
    const points = []
    for (let i = 1; i < delta * subdivisions; i++) {
        const x = p0.x + i * dx / subdivisions
        const z = p0.z + i * dz / subdivisions
        const y = game.world.getHeight(Math.round(x), Math.round((z)))
        points.push({x, y, z})
    }
    return points
}