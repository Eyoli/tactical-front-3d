type Matrix = number[][]

const N = 8
const RANDOM_INITIAL_RANGE = 10
const MATRIX_LENGTH = Math.pow(2, N) + 1

function randomInRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function generateMatrix(): Matrix {
    const matrix = new Array(MATRIX_LENGTH)
        .fill(0)
        .map(() => new Array(MATRIX_LENGTH).fill(null))

    matrix[0][MATRIX_LENGTH - 1] = randomInRange(0, RANDOM_INITIAL_RANGE)
    matrix[MATRIX_LENGTH - 1][0] = randomInRange(0, RANDOM_INITIAL_RANGE)
    matrix[0][0] = randomInRange(0, RANDOM_INITIAL_RANGE)
    matrix[MATRIX_LENGTH - 1][MATRIX_LENGTH - 1] = randomInRange(
        0,
        RANDOM_INITIAL_RANGE
    )

    return matrix
}

function calculateSquare(matrix: Matrix, chunkSize: number, randomFactor: number) {
    for (let i = 0; i < matrix.length - 1; i += chunkSize) {
        for (let j = 0; j < matrix.length - 1; j += chunkSize) {
            const BOTTOM_RIGHT = matrix[j + chunkSize]
                ? matrix[j + chunkSize][i + chunkSize]
                : null
            const BOTTOM_LEFT = matrix[j + chunkSize]
                ? matrix[j + chunkSize][i]
                : null
            const TOP_LEFT = matrix[j][i]
            const TOP_RIGHT = matrix[j][i + chunkSize]
            const { count, sum } = [
                BOTTOM_RIGHT,
                BOTTOM_LEFT,
                TOP_LEFT,
                TOP_RIGHT
            ].reduce(
                (result, value) => {
                    if (value != null && isFinite(value)) {
                        result.sum += value
                        result.count += 1
                    }
                    return result
                },
                { sum: 0, count: 0 }
            )
            matrix[j + chunkSize / 2][i + chunkSize / 2] =
                sum / count + randomInRange(-randomFactor, randomFactor)
        }
    }
}

function calculateDiamond(matrix: Matrix, chunkSize: number, randomFactor: number) {
    const half = chunkSize / 2
    for (let y = 0; y < matrix.length; y += half) {
        for (let x = (y + half) % chunkSize; x < matrix.length; x += chunkSize) {
            const BOTTOM = matrix[y + half] ? matrix[y + half][x] : null
            const LEFT = matrix[y][x - half]
            const TOP = matrix[y - half] ? matrix[y - half][x] : null
            const RIGHT = matrix[y][x + half]
            const { count, sum } = [BOTTOM, LEFT, TOP, RIGHT].reduce(
                (result, value) => {
                    if (value != null && isFinite(value)) {
                        result.sum += value
                        result.count += 1
                    }
                    return result
                },
                { sum: 0, count: 0 }
            )
            matrix[y][x] = sum / count + randomInRange(-randomFactor, randomFactor)
        }
    }
    return matrix
}

function diamondSquare(matrix: Matrix) {
    let chunkSize = MATRIX_LENGTH - 1
    let randomFactor = RANDOM_INITIAL_RANGE

    while (chunkSize > 1) {
        calculateSquare(matrix, chunkSize, randomFactor)
        calculateDiamond(matrix, chunkSize, randomFactor)
        chunkSize /= 2
        randomFactor /= 2
    }

    return matrix
}

function normalizeMatrix(matrix: Matrix): Matrix {
    const maxValue = matrix.reduce((max, row) => {
        return row.reduce((max, value) => Math.max(value, max))
    }, -Infinity)

    return matrix.map((row) => {
        return row.map((val) => val / maxValue)
    })
}

export const generateTerrain = (length: number, width: number, maxHeight: number) => {
    const normalizedMatrix = normalizeMatrix(diamondSquare(generateMatrix()))
    const matrix: Matrix = []
    for (let i = 0; i < length; i++) {
        matrix[i] = []
        for (let j = 0; j < width; j++) {
            const x = Math.floor(i * normalizedMatrix.length / length)
            const y = Math.floor(j * normalizedMatrix[x].length / width)
            matrix[i][j] = normalizedMatrix[x][y] * maxHeight
        }
    }
    return matrix
}