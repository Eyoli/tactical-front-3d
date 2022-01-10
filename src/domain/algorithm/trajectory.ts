export const GRAVITATIONAL_FORCE_EQUIVALENT = 9.80665
type Position = { x: number, y: number }
type ProjectileMotionProblem = {
    // launch angle interval
    alpha: { min: number, max: number, divisions: number }
    // max initial velocity
    v0Max: number
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
                    v0Max,
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
            const V0 = Math.min(v0Max, Math.sqrt(this.G * R * R / (2 * (R * Math.tan(alphas[i]) - H))) / Math.cos(alphas[i]))
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