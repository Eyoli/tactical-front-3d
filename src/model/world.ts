import {euclideanModulo} from "three/src/math/MathUtils"
import {Graph} from "../algorithm/path-finder"

export type Position3D = {
    x: number
    y: number
    z: number
}

export type Unit = {}

export class WorldMap implements Graph<Position3D, number> {
    readonly chunkSize: number
    private readonly chunkSliceSize: number
    private readonly chunks: Uint8Array[]

    constructor(chunkSize: number) {
        this.chunkSize = chunkSize
        this.chunkSliceSize = chunkSize * chunkSize
        this.chunks = []
    }

    getNeighbours = ({x, z}: Position3D): Position3D[] => {
        const {getVoxel} = this
        return [
            {x: x - 1, y: this.getHeight(x - 1, z), z},
            {x: x + 1, y: this.getHeight(x + 1, z), z},
            {x: x, y: this.getHeight(x, z - 1), z: z - 1},
            {x: x, y: this.getHeight(x, z + 1), z: z + 1},
        ].filter(p => getVoxel(p) !== 0)
    }

    costBetween = (node: Position3D, neighbour: Position3D): number => {
        return 1
    }

    distanceBetween = ({x: x1, y: y1}: Position3D, {x: x2, y: y2}: Position3D): number => {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
    }

    getNodeKey = ({x, y, z}: Position3D) => {
        const {chunkSize, chunkSliceSize} = this
        const voxelX = euclideanModulo(x, chunkSize) | 0
        const voxelY = euclideanModulo(y, chunkSize) | 0
        const voxelZ = euclideanModulo(z, chunkSize) | 0
        return voxelY * chunkSliceSize +
            voxelZ * chunkSize +
            voxelX
    }

    setVoxel = (p: Position3D, v: number, createChunk = true) => {
        let chunk = this.getChunk(this.computeChunkId(p))
        if (!chunk) {
            if (!createChunk) {
                return
            }
            chunk = this.createChunk(p)
        }
        const voxelOffset = this.getNodeKey(p)
        chunk[voxelOffset] = v
    }

    getVoxel = (p: Position3D) => {
        const chunk = this.getChunk(this.computeChunkId(p))
        if (!chunk) {
            return 0
        }
        const voxelOffset = this.getNodeKey(p)
        return chunk[voxelOffset]
    }

    getHeight = (x: number, z: number) => {
        let bottom = {x, y: 0, z}
        const chunk = this.getChunk(this.computeChunkId(bottom))
        if (!chunk) {
            return 0
        }
        let voxel = chunk[this.getNodeKey(bottom)]
        while (voxel > 0 && bottom.y < this.chunkSize) {
            voxel = chunk[this.getNodeKey(bottom)]
            bottom.y++
        }
        return bottom.y
    }

    computeChunkId = ({x, y, z}: Position3D) => {
        const {chunkSize} = this
        const cellX = Math.floor(x / chunkSize)
        const cellY = Math.floor(y / chunkSize)
        const cellZ = Math.floor(z / chunkSize)
        return `${cellX},${cellY},${cellZ}`
    }

    private createChunk = (p: Position3D) => {
        const chunkId = this.computeChunkId(p)
        let cell = this.getChunk(chunkId)
        if (!cell) {
            const {chunkSize} = this
            cell = new Uint8Array(chunkSize * chunkSize * chunkSize)
            this.setCellForVoxel(chunkId, cell)
        }
        return cell
    }

    private getChunk = (chunkId: string): Uint8Array => this.chunks[chunkId]

    private setCellForVoxel = (chunkId: string, cell: Uint8Array) => {
        this.chunks[chunkId] = cell
    }
}

export class World {
    readonly unitsToPositions = new Map<Unit, Position3D>()
    readonly worldMap: WorldMap

    constructor(worldMap: WorldMap) {
        this.unitsToPositions.set({}, {x: 1, y: worldMap.getHeight(1, 1), z: 1})
        this.worldMap = worldMap
    }
}