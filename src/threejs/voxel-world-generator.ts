import {VoxelWorld} from "./voxel-world"
import {generateTerrain} from "../algorithm/diamond-square"

const randInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min) + min)
}

const FACES = [
    { // left
        uvRow: 0,
        dir: [-1, 0, 0],
        corners: [
            {pos: [0, 1, 0], uv: [0, 1]},
            {pos: [0, 0, 0], uv: [0, 0]},
            {pos: [0, 1, 1], uv: [1, 1]},
            {pos: [0, 0, 1], uv: [1, 0]},
        ],
    },
    { // right
        uvRow: 0,
        dir: [1, 0, 0],
        corners: [
            {pos: [1, 1, 1], uv: [0, 1]},
            {pos: [1, 0, 1], uv: [0, 0]},
            {pos: [1, 1, 0], uv: [1, 1]},
            {pos: [1, 0, 0], uv: [1, 0]},
        ],
    },
    { // bottom
        uvRow: 1,
        dir: [0, -1, 0],
        corners: [
            {pos: [1, 0, 1], uv: [1, 0]},
            {pos: [0, 0, 1], uv: [0, 0]},
            {pos: [1, 0, 0], uv: [1, 1]},
            {pos: [0, 0, 0], uv: [0, 1]},
        ],
    },
    { // top
        uvRow: 2,
        dir: [0, 1, 0],
        corners: [
            {pos: [0, 1, 1], uv: [1, 1]},
            {pos: [1, 1, 1], uv: [0, 1]},
            {pos: [0, 1, 0], uv: [1, 0]},
            {pos: [1, 1, 0], uv: [0, 0]},
        ],
    },
    { // back
        uvRow: 0,
        dir: [0, 0, -1],
        corners: [
            {pos: [1, 0, 0], uv: [0, 0]},
            {pos: [0, 0, 0], uv: [1, 0]},
            {pos: [1, 1, 0], uv: [0, 1]},
            {pos: [0, 1, 0], uv: [1, 1]},
        ],
    },
    { // front
        uvRow: 0,
        dir: [0, 0, 1],
        corners: [
            {pos: [0, 0, 1], uv: [0, 0]},
            {pos: [1, 0, 1], uv: [1, 0]},
            {pos: [0, 1, 1], uv: [0, 1]},
            {pos: [1, 1, 1], uv: [1, 1]},
        ],
    },
]

export interface VoxelWorldGenerator {
    generate: (world: VoxelWorld) => void
    generateGeometryDataForCell: (world: VoxelWorld, cellX: number, cellY: number, cellZ: number) => any
}

export class BasicVoxelWorldGenerator implements VoxelWorldGenerator {
    private readonly length: number
    private readonly width: number
    private readonly maxHeight: number
    private tileSize: number
    private tileTextureWidth: number
    private tileTextureHeight: number

    constructor(
        length: number,
        width: number,
        maxHeight: number,
        tileSize: number,
        tileTextureWidth: number,
        tileTextureHeight: number) {
        this.length = length
        this.width = width
        this.maxHeight = maxHeight
        this.tileSize = tileSize
        this.tileTextureWidth = tileTextureWidth
        this.tileTextureHeight = tileTextureHeight
    }

    generate(world: VoxelWorld): void {
        const heightmap = generateTerrain(this.length, this.width, this.maxHeight)
        for (let y = 0; y < this.maxHeight; ++y) {
            for (let z = 0; z < this.width; ++z) {
                for (let x = 0; x < this.length; ++x) {
                    // const height = (Math.sin(x / this.cellSize * Math.PI * 2) + Math.sin(z / this.cellSize * Math.PI * 3)) * (this.cellSize / 6) + (this.cellSize / 2);
                    const height = heightmap[x][z]
                    if (y < height) {
                        world.setVoxel(x, y, z, randInt(1, 17))
                    }
                }
            }
        }
    }

    generateGeometryDataForCell(world: VoxelWorld, cellX: number, cellY: number, cellZ: number) {
        const {tileSize, tileTextureWidth, tileTextureHeight} = this
        const {cellSize} = world
        const positions = []
        const normals = []
        const uvs = []
        const indices = []
        const startX = cellX * cellSize
        const startY = cellY * cellSize
        const startZ = cellZ * cellSize

        for (let y = 0; y < cellSize; ++y) {
            const voxelY = startY + y
            for (let z = 0; z < cellSize; ++z) {
                const voxelZ = startZ + z
                for (let x = 0; x < cellSize; ++x) {
                    const voxelX = startX + x
                    const voxel = world.getVoxel(voxelX, voxelY, voxelZ)
                    if (voxel) {
                        // voxel 0 is sky (empty) so for UVs we start at 0
                        const uvVoxel = voxel - 1
                        // There is a voxel here but do we need faces for it?
                        for (const {dir, corners, uvRow} of FACES) {
                            const neighbor = world.getVoxel(
                                voxelX + dir[0],
                                voxelY + dir[1],
                                voxelZ + dir[2])
                            if (!neighbor) {
                                // this voxel has no neighbor in this direction so we need a face.
                                const ndx = positions.length / 3
                                for (const {pos, uv} of corners) {
                                    positions.push(pos[0] + x, pos[1] + y, pos[2] + z)
                                    normals.push(...dir)
                                    uvs.push(
                                        (uvVoxel + uv[0]) * tileSize / tileTextureWidth,
                                        1 - (uvRow + 1 - uv[1]) * tileSize / tileTextureHeight)
                                }
                                indices.push(
                                    ndx, ndx + 1, ndx + 2,
                                    ndx + 2, ndx + 1, ndx + 3,
                                )
                            }
                        }
                    }
                }
            }
        }

        return {
            positions,
            normals,
            uvs,
            indices,
        }
    }
}