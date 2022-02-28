import {WorldMap} from "../src/domain/model/world-map"
import {Unit} from "../src/domain/model/types"

export const initWorldMap = (chunkSize: number, heightmap?: number[][], data?: number[][]) => {
    const worldMap = new WorldMap(chunkSize)

    for (let i = 0; i < worldMap.chunkSize; i++) {
        for (let j = 0; j < worldMap.chunkSize; j++) {
            worldMap.setVoxel({x: i, y: heightmap ? heightmap[i][j] : 0, z: j}, data ? data[i][j] : 1)
        }
    }
    return worldMap
}