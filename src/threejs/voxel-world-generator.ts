import {generateTerrain} from "../algorithm/diamond-square"
import {World} from "../model/world"

const randInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min) + min)
}

export interface VoxelWorldGenerator {
    generate: (world: World) => void
}

export class BasicVoxelWorldGenerator implements VoxelWorldGenerator {
    private readonly length: number
    private readonly width: number
    private readonly maxHeight: number

    constructor(
        length: number,
        width: number,
        maxHeight: number) {
        this.length = length
        this.width = width
        this.maxHeight = maxHeight
    }

    generate(world: World, dx: number = 0, dy: number = 0, dz: number = 0): void {
        const heightmap = generateTerrain(this.length, this.width, this.maxHeight)
        for (let y = 0; y < this.maxHeight; ++y) {
            for (let z = 0; z < this.width; ++z) {
                for (let x = 0; x < this.length; ++x) {
                    // const height = (Math.sin(x / this.cellSize * Math.PI * 2) + Math.sin(z / this.cellSize * Math.PI * 3)) * (this.cellSize / 6) + (this.cellSize / 2);
                    const height = heightmap[x][z]
                    if (y < height) {
                        if (y < 3) {
                            world.setVoxel({x: dx + x, y: dy + y, z: dz + z}, 1)
                        } else if (y < 12) {
                            world.setVoxel({x: dx + x, y: dy + y, z: dz + z}, 2)
                        } else {
                            world.setVoxel({x: dx + x, y: dy + y, z: dz + z}, 3)
                        }
                    }
                }
            }
        }
    }
}