import {WorldMap} from "../src/model/world"
import {PathFinderManager} from "../src/algorithm/path-finder"

const pathFinderManager = new PathFinderManager()

describe('world path finding', () => {

    it('', () => {
        const worldMap = new WorldMap(10)
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                worldMap.setVoxel({x: i, y: 0, z: j}, 1)
            }
        }

        const pathFinder = pathFinderManager.getShortestPath(worldMap, {x: 0, y: 1, z: 0}, {x: 5, y: 1, z: 5})
        const result = pathFinder.find()

        expect(result.path.length).toBe(11)
    })
})