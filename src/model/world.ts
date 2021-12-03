import {euclideanModulo} from "three/src/math/MathUtils"
import {Graph, PathFinderManager} from "../algorithm/path-finder"

export type Position3D = {
    x: number
    y: number
    z: number
}

export type Position2D = {
    x: number
    z: number
}

export type Unit = {
    id: number
}

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
        const {getVoxel, getHeight} = this
        return [
            {x: x - 1, y: getHeight(x - 1, z), z},
            {x: x + 1, y: getHeight(x + 1, z), z},
            {x: x, y: getHeight(x, z - 1), z: z - 1},
            {x: x, y: getHeight(x, z + 1), z: z + 1},
        ].filter(p => getVoxel({x: p.x, y: p.y - 1, z: p.z}) !== 0)
    }

    costBetween = (): number => {
        return 1
    }

    distanceBetween = ({x: x1, z: z1}: Position3D, {x: x2, z: z2}: Position3D): number => {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1))
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
            bottom.y++
            voxel = chunk[this.getNodeKey(bottom)]
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
    readonly unitsToPositions = new Map<number, Position3D>()
    readonly units: Unit[] = []
    readonly worldMap: WorldMap
    private pathFinderManager: PathFinderManager<Position3D, number>

    constructor(worldMap: WorldMap) {
        this.pathFinderManager = new PathFinderManager()
        this.worldMap = worldMap
    }

    addUnit = (unit: Unit, p: Position2D) => {
        this.units.push(unit)
        this.unitsToPositions.set(unit.id, {
            x: p.x,
            y: this.worldMap.getHeight(1, 1),
            z: p.z
        })
        return this
    }

    moveUnit = (unit: Unit, {x, z}: Position2D) => {
        console.log(x, z)

        const from = this.unitsToPositions.get(unit.id)
        // No current position for the selected unit, we do nothing
        if (!from) {
            console.log("No starting point")
            return null
        }

        const to = {
            x: x,
            y: this.worldMap.getHeight(x, z),
            z: z
        }
        const pathFinder = this.pathFinderManager.getShortestPath(this.worldMap, from, to)
        const result = pathFinder.find()
        if (result.path.length > 0) {
            this.unitsToPositions.set(unit.id, to)
        }
        return result.path
    }

    getClosestPosition = ({x, z}: Position2D): Position2D => {
        return {x: Math.floor(x), z: Math.floor(z)}
    }
}