import {Graph} from "../algorithm/path-finder"
import {Position2D, Position3D} from "./types"

/**
 * World map specific for projectiles. Indeed they don't really care about terrain.
 */
export class ProjectileWorldMap implements Graph<Position3D, number> {

    constructor(private readonly worldMap: WorldMap) {
    }

    costBetween = (node: Position3D, neighbour: Position3D) => 1

    distanceBetween = (node1: Position3D, node2: Position3D) => this.worldMap.distanceBetween(node1, node2)

    getNeighbours = (node: Position3D) => this.worldMap.getNeighbours(node)

    getNodeKey = (node: Position3D) => this.worldMap.getNodeKey(node)
}

export class WorldMap implements Graph<Position3D, number> {
    readonly chunkSize: number
    private readonly chunkSliceSize: number
    private readonly chunks = new Map<string, Uint8Array>()
    private readonly voxelCostMap = new Map<number, number>()

    constructor(chunkSize: number) {
        this.chunkSize = chunkSize
        this.chunkSliceSize = chunkSize * chunkSize
    }

    getNeighbours = ({x, z}: Position3D): Position3D[] => {
        const {getVoxel, getHeight} = this
        return [
            {x: x - 1, y: getHeight(x - 1, z), z},
            {x: x + 1, y: getHeight(x + 1, z), z},
            {x: x, y: getHeight(x, z - 1), z: z - 1},
            {x: x, y: getHeight(x, z + 1), z: z + 1},
        ].filter(p => getVoxel({x: p.x, y: p.y - 1, z: p.z}) !== 0)
    }

    costBetween = (p1: Position3D, p2: Position3D): number => this.voxelCostMap.get(this.getVoxel(p2)) ?? 1

    distanceBetween = ({x: x1, z: z1}: Position3D, {x: x2, z: z2}: Position3D): number => {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1))
    }

    getNodeKey = ({x, y, z}: Position3D) => {
        const {chunkSize, chunkSliceSize} = this
        const voxelX = x % chunkSize | 0
        const voxelY = y % chunkSize | 0
        const voxelZ = z % chunkSize | 0
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

    fillCostMap = (map: Map<number, number>) =>
        map.forEach((cost, voxelValue) => this.voxelCostMap.set(voxelValue, cost))

    getVoxel = (p: Position3D) => {
        const chunk = this.getChunk(this.computeChunkId(p))
        if (!chunk) {
            return 0
        }
        const voxelKey = this.getNodeKey(p)
        return chunk[voxelKey]
    }

    getHeight = (x: number, z: number) => {
        const chunk = this.getChunk(this.computeChunkId({x, y: 0, z}))
        if (!chunk) {
            return 0
        }
        let y = 0
        let height = 0
        while (y < this.chunkSize) {
            const voxel = chunk[this.getNodeKey({x, y, z})]
            if (voxel > 0) {
                height = y
            }
            y++
        }
        return height + 1
    }

    getClosestPosition2D = ({x, z}: Position2D): Position2D => {
        return {x: Math.floor(x), z: Math.floor(z)}
    }

    getPosition3D = ({x, z}: Position2D) => ({
        x: x,
        y: this.getHeight(x, z),
        z: z
    })

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

    private getChunk = (chunkId: string): Uint8Array | undefined => this.chunks.get(chunkId)

    private setCellForVoxel = (chunkId: string, cell: Uint8Array) => {
        this.chunks.set(chunkId, cell)
    }
}