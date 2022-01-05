type ProjectileMotionProblem = {
    // launch angle
    alpha?: number
    // start point
    x0?: number
    y0?: number
    // end point
    x1: number
    y1: number
    // temporal step
    dt?: number
}
export const computeProjectileMotion = ({
                                            x0 = 0,
                                            y0 = 0,
                                            x1,
                                            y1,
                                            alpha = Math.PI / 4,
                                            dt = 0.05
                                        }: ProjectileMotionProblem) => {
    const G = 9.80665
    const R = x1 - x0, H = y1 - y0

    if (Math.tan(alpha) <= H / R) throw new Error("No solution found")

    const V0x = Math.sqrt(G * R * R / (2 * (R * Math.tan(alpha) - H)))
    const V0y = V0x * Math.tan(alpha)
    const T = R / V0x
    const solution = []
    let x = x0, y = y0
    for (let t = 0; t <= T; t += dt) {
        solution.push({x: x, y: y})
        x = x0 + V0x * t
        y = y0 + V0y * t - G * t * t / 2
        t += dt
    }

    return solution
}