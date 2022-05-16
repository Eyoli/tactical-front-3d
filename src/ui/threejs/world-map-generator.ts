import {generateTerrain} from "../../domain/algorithm/diamond-square"
import {WorldMap} from "../../domain/models/world-map"
import {Delaunay} from "d3-delaunay"
import {randomInRange} from "../../domain/algorithm/probability";

export interface WorldMapGenerator {
    generate: () => WorldMap
}

export class BasicWorldMapGenerator implements WorldMapGenerator {
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

    generate(): WorldMap {
        const {length, width, maxHeight} = this
        const heightmap = generateTerrain(length, width, 4, 2, 1)
        const worldMap = new WorldMap(length, 3)

        // Here we will have as many biomes as the number of points generated
        const biomesNumber = randomInRange(3, 10)
        let points = []
        for (let i = 0; i < biomesNumber; i++) {
            points.push([randomInRange(0, length), randomInRange(0, width)])
        }
        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width - 1, length - 1])

        for (let z = 0; z < width; ++z) {
            for (let x = 0; x < length; ++x) {
                const height = heightmap[x][z]
                const polygon = Array.from(voronoi.cellPolygons()).find(p => voronoi.contains(p.index, x, z))
                for (let y = 0; y < maxHeight; ++y) {
                    if (polygon && y < height) {
                        worldMap.setVoxel({x, y, z}, 1 + polygon.index % 3)
                    }
                }
            }
        }

        return worldMap
    }
}