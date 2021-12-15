import {Unit, World, WorldMap} from "../src/domain/model/world"
import {WorldMapService} from "../src/domain/service/services"

const pathFinderManager = new WorldMapService()

const initWorldMap = (chunkSize: number, heightmap?: number[][], data?: number[][]) => {
    const worldMap = new WorldMap(chunkSize)

    for (let i = 0; i < worldMap.chunkSize; i++) {
        for (let j = 0; j < worldMap.chunkSize; j++) {
            worldMap.setVoxel({x: i, y: heightmap ? heightmap[i][j] : 0, z: j}, data ? data[i][j] : 1)
        }
    }
    return worldMap
}

const aUnit = (): Unit => ({id: 1, moves: 1, jump: 1})

describe('world', () => {

    it('should find the shortest path between two locations', () => {
        const worldMap = initWorldMap(10)

        const pathFinder = pathFinderManager.getShortestPath(worldMap, {x: 0, y: 1, z: 0}, {x: 5, y: 1, z: 5})
        const result = pathFinder.find()

        expect(result.path?.length).toBe(11)
    })

    it('should select a unit and move it', () => {
        const worldMap = initWorldMap(10)
        const world = new World(worldMap)
        world.addUnit(aUnit(), {x: 1, z: 1})

        world.moveUnit(world.units[0], {x: 5, z: 5})

        expect(world.unitsToPositions.get(world.units[0].id)).toEqual({x: 5, y: 1, z: 5})
    })

    it('should get positions accessible to a unit', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [2, 0, 1], [1, 1, 1]])
        const world = new World(worldMap)
        world.addUnit(aUnit(), {x: 1, z: 1})

        const positions = world.getAccessiblePositions(world.units[0])

        expect(positions.length).toBe(3)
        expect(positions).toContain({x: 0, y: 2, z: 1})
        expect(positions).toContain({x: 2, y: 2, z: 1})
        expect(positions).toContain({x: 1, y: 2, z: 2})
    })
})