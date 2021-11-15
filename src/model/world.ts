import {euclideanModulo} from "three/src/math/MathUtils"

export type Position3D = {
    x: number
    y: number
    z: number
}

export class Unit {

}

export class World {
    readonly chunkSize: number
    private readonly chunkSliceSize: number
    private readonly chunks: Uint8Array[]
    readonly unitsToPositions = new Map<Unit, Position3D>()

    constructor(chunkSize: number) {
        this.chunkSize = chunkSize
        this.chunkSliceSize = chunkSize * chunkSize
        this.chunks = []
        this.unitsToPositions.set(new Unit(), {x: 1, y: 20, z: 1})
    }

    setVoxel = (p: Position3D, v: number, createChunk = true) => {
        let chunk = this.getChunk(this.computeChunkId(p))
        if (!chunk) {
            if (!createChunk) {
                return
            }
            chunk = this.createChunk(p)
        }
        const voxelOffset = this.computeVoxelOffset(p)
        chunk[voxelOffset] = v
    }

    getVoxel = (p: Position3D) => {
        const chunk = this.getChunk(this.computeChunkId(p))
        if (!chunk) {
            return 0
        }
        const voxelOffset = this.computeVoxelOffset(p)
        return chunk[voxelOffset]
    }

    getHeight = (x: number, z: number) => {
        let bottom = {x, y: 0, z}
        const chunk = this.getChunk(this.computeChunkId(bottom))
        if (!chunk) {
            return 0
        }
        let voxel = chunk[this.computeVoxelOffset(bottom)]
        while (voxel > 0 && bottom.y < this.chunkSize) {
            voxel = chunk[this.computeVoxelOffset(bottom)]
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

    private computeVoxelOffset = ({x, y, z}: Position3D) => {
        const {chunkSize, chunkSliceSize} = this
        const voxelX = euclideanModulo(x, chunkSize) | 0
        const voxelY = euclideanModulo(y, chunkSize) | 0
        const voxelZ = euclideanModulo(z, chunkSize) | 0
        return voxelY * chunkSliceSize +
            voxelZ * chunkSize +
            voxelX
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