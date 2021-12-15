import {generateTerrain} from "../domain/algorithm/diamond-square"
import {WorldMap} from "../domain/model/world"

const randInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min) + min)
}

export interface WorldMapGenerator {
    generate: (worldMap: WorldMap) => void
}

export class BasicWorldMapGenerator implements WorldMapGenerator {
    private readonly length: number
    private readonly width: number
    private readonly maxHeight: number
    private readonly minHeight: number

    constructor(
        length: number,
        width: number,
        maxHeight: number,
        minHeight: number = 0) {
        this.length = length
        this.width = width
        this.maxHeight = maxHeight
        this.minHeight = minHeight
    }

    generate(worldMap: WorldMap, dx: number = 0, dy: number = 0, dz: number = 0): void {
        const {length, width, maxHeight, minHeight} = this
        const heightmap = generateTerrain(length, width, maxHeight, minHeight)
        for (let y = 0; y < maxHeight; ++y) {
            for (let z = 0; z < width; ++z) {
                for (let x = 0; x < length; ++x) {
                    const height = heightmap[x][z]
                    if (y < height) {
                        if (y < 3) {
                            worldMap.setVoxel({x: dx + x, y: dy + y, z: dz + z}, 1)
                        } else if (y < 12) {
                            worldMap.setVoxel({x: dx + x, y: dy + y, z: dz + z}, 2)
                        } else {
                            worldMap.setVoxel({x: dx + x, y: dy + y, z: dz + z}, 3)
                        }
                    }
                }
            }
        }
    }
}