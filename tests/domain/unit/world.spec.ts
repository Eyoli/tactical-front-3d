import {initWorldMap} from "../../common"
import {NO_PATH} from "../../../src/domain/algorithm/path-finder";

describe('World', () => {

    describe('Neighbours', () => {
        it('should find the neighbours of a given location', () => {
            const world = initWorldMap(10)

            const neighbours = world.getNeighbours({x: 1, y: 1, z: 1})

            expect(neighbours).toMatchObject([
                {x: 0, y: 1, z: 1},
                {x: 2, y: 1, z: 1},
                {x: 1, y: 1, z: 0},
                {x: 1, y: 1, z: 2},
            ])
        })

        it('should find the neighbours at the edge of the map', () => {
            const world = initWorldMap(10)

            const neighbours = world.getNeighbours({x: 0, y: 1, z: 0})

            expect(neighbours).toMatchObject([
                {x: 1, y: 1, z: 0},
                {x: 0, y: 1, z: 1},
            ])
        })
    })

    describe('Shortest path', () => {
        it('should find the shortest path between two locations', () => {
            const world = initWorldMap(10)

            const pathFinder = world.getShortestPath({x: 0, y: 1, z: 0}, {x: 5, y: 1, z: 5})
            const result = pathFinder.find()

            expect(result).toMatchObject({
                cost: 10,
                path: [
                    {x: 0, y: 1, z: 0},
                    {x: 1, y: 1, z: 0},
                    {x: 1, y: 1, z: 1},
                    {x: 2, y: 1, z: 1},
                    {x: 2, y: 1, z: 2},
                    {x: 3, y: 1, z: 2},
                    {x: 3, y: 1, z: 3},
                    {x: 4, y: 1, z: 3},
                    {x: 4, y: 1, z: 4},
                    {x: 5, y: 1, z: 4},
                    {x: 5, y: 1, z: 5},
                ],
            })
        })

        it('should return empty table when no path is available between the locations', () => {
            const world = initWorldMap(2, [[1, 0], [0, 1]])

            const pathFinder = world.getShortestPath({x: 0, y: 1, z: 0}, {x: 1, y: 1, z: 1})
            const result = pathFinder.find()

            expect(result).toMatchObject(NO_PATH)
        })
    })
})
