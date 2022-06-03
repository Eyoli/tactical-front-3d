import {EdgeFilter, Graph, PathFinder} from "../algorithm/path-finder"
import {Position2D, Position3D} from "./types"
import {randomInRange} from "../algorithm/probability"

const getCandidates = <N, K>(graph: Graph<N, K>, start: N, startCost: number, filter?: EdgeFilter<N>) => {
    let candidates = graph.getNeighbours(start)
    if (filter) {
        candidates = candidates.filter(neighbour => filter(start, neighbour))
    }
    return candidates.map(value => ({
        node: value,
        cost: startCost + graph.costBetween(start, value)
    }))
}

/**
 * World map specific for projectiles. Indeed they don't really care about terrain.
 */
export class ProjectileGraph<N, K> implements Graph<N, K> {

    constructor(
        private readonly graph: Graph<N, K>) {
    }

    costBetween = (node: N, neighbour: N) => this.graph.distanceBetween(node, neighbour)

    distanceBetween = (node1: N, node2: N) => this.graph.distanceBetween(node1, node2)

    getNeighbours = (p: N): N[] => this.graph.getNeighbours(p)

    getNodeKey = (node: N) => this.graph.getNodeKey(node)
}

export class WorldMap implements Graph<Position3D, number> {

    private readonly chunkSliceSize: number
    private readonly chunk: Uint8Array
    private readonly voxelCostMap = new Map<number, number>()
    private readonly projectileGraph: ProjectileGraph<Position3D, number>

    constructor(
        readonly size: number,
        readonly waterLevel: number = 0
    ) {
        this.chunkSliceSize = size * size
        this.chunk = new Uint8Array(size * size * size)
        this.projectileGraph = new ProjectileGraph(this)
    }

    getShortestPath(startNode: Position3D, endNode: Position3D, filter?: EdgeFilter<Position3D>): PathFinder<Position3D, number> {
        return new PathFinder(this, startNode, endNode, filter)
    }

    getAccessibleNodes(start: Position3D, minCost: number, maxCost: number, filter?: EdgeFilter<Position3D>): Position3D[] {
        const accessiblePositions: Position3D[] = []
        const tested: Position3D[] = []
        const candidates = [{node: start, cost: 0}]
        while (candidates.length > 0) {
            const candidate = candidates.shift()!
            const nodeKey = this.getNodeKey(candidate.node)
            const isAlreadyTested = tested.find(node => nodeKey === this.getNodeKey(node))
            if (candidate.cost <= maxCost && !isAlreadyTested) {
                tested.push(candidate.node)
                if (candidate.cost >= minCost) {
                    accessiblePositions.push(candidate.node)
                }
                const newCandidates = getCandidates(this, candidate.node, candidate.cost, filter)
                candidates.push(...newCandidates)
            }
        }

        return accessiblePositions
    }

    getNodesAccessibleByFlight(start: Position3D, minCost: number, maxCost: number, filter?: EdgeFilter<Position3D>): Position3D[] {
        const {projectileGraph} = this

        const accessiblePositions: Position3D[] = []
        const tested: Position3D[] = []
        const candidates = [{node: start, cost: 0}]
        while (candidates.length > 0) {
            const candidate = candidates.shift()!
            const nodeKey = projectileGraph.getNodeKey(candidate.node)
            const isAlreadyTested = tested.find(node => nodeKey === projectileGraph.getNodeKey(node))
            const d = projectileGraph.distanceBetween(start, candidate.node)
            if (d <= maxCost && !isAlreadyTested) {
                tested.push(candidate.node)
                if (d >= minCost) {
                    accessiblePositions.push(candidate.node)
                }
                const newCandidates = getCandidates(projectileGraph, candidate.node, d, filter)
                candidates.push(...newCandidates)
            }
        }

        return accessiblePositions
    }

    getClosestPositionInWorld = ({x, z}: Position2D): Position3D => {
        const ix = Math.floor(x), iz = Math.floor(z)
        return {
            x: ix,
            y: this.getHeight(ix, iz),
            z: iz
        }
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

    costBetween = (p1: Position3D, p2: Position3D): number => {
        if (p2.y < this.waterLevel) return 99
        if (p2.y === this.waterLevel) return 2
        return this.voxelCostMap.get(this.getVoxel(p2)) || 1
    }

    distanceBetween = ({x: x1, z: z1}: Position3D, {x: x2, z: z2}: Position3D): number => {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1))
    }

    getNodeKey = ({x, y, z}: Position3D) => {
        const {size, chunkSliceSize} = this
        const voxelX = x % size | 0
        const voxelY = y % size | 0
        const voxelZ = z % size | 0
        return voxelY * chunkSliceSize + voxelZ * size + voxelX
    }

    setVoxel = (p: Position3D, v: number) => {
        const {chunk} = this
        const voxelOffset = this.getNodeKey(p)
        chunk[voxelOffset] = v
    }

    fillCostMap = (map: Map<number, number>) =>
        map.forEach((cost, voxelValue) => this.voxelCostMap.set(voxelValue, cost))

    getVoxel = (p: Position3D) => {
        const {chunk, size, getNodeKey} = this
        if (p.x < 0 || p.z < 0 || p.x >= size || p.z >= size) {
            return 0
        }
        const voxelKey = getNodeKey(p)
        return chunk[voxelKey]
    }

    getHeight = (x: number, z: number) => {
        const {chunk} = this
        let y = 0
        let height = 0
        while (y < this.size) {
            const voxel = chunk[this.getNodeKey({x, y, z})]
            if (voxel > 0) {
                height = y
            }
            y++
        }
        return height + 1
    }

    getHeighestPosition = ({x, z}: Position2D) => ({
        x: x,
        y: this.getHeight(x, z),
        z: z
    })

    getRandomPosition = (xMin: number, zMin: number, xMax: number, zMax: number): Position2D => {
        const validPositions: Position2D[] = []
        for (let x = xMin; x < xMax; x++) {
            for (let z = zMin; z < zMax; z++) {
                const y = this.getHeight(x, z)
                if (y >= this.waterLevel) {
                    validPositions.push({x, z})
                }
            }
        }

        if (validPositions.length === 0) throw new Error("No valid position available")
        return validPositions[randomInRange(0, validPositions.length - 1)]
    }
}