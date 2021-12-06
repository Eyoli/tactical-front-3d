import {World, WorldMap} from "../src/model/world"
import {PathFinderManager} from "../src/algorithm/path-finder"

const pathFinderManager = new PathFinderManager()

const initWorldMap = () => {
    const worldMap = new WorldMap(10)
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            worldMap.setVoxel({x: i, y: 0, z: j}, 1)
        }
    }
    return worldMap
}

describe('world', () => {

    it('should find the shortest path between two locations', () => {
        const worldMap = initWorldMap()

        const pathFinder = pathFinderManager.getShortestPath(worldMap, {x: 0, y: 1, z: 0}, {x: 5, y: 1, z: 5})
        const result = pathFinder.find()

        expect(result.path?.length).toBe(11)
    })

    it('should select a unit and move it', () => {
        const worldMap = initWorldMap()
        const world = new World(worldMap)

        world.moveUnit(world.units[0], {x: 5, z: 5})

        expect(world.unitsToPositions.get(world.units[0].id)).toEqual({x: 5, y: 1, z: 5})
    })
})