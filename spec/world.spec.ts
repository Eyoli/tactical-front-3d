import {World} from "../src/domain/model/world"
import {Player, Unit} from "../src/domain/model/types"
import {WorldMapService} from "../src/domain/service/services"
import {WorldMap} from "../src/domain/model/world-map"

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

const aUnit = (): Unit => new Unit({
    id: 1, name: "", moves: 1, jump: 1, hp: 10, weapon: {range: {min: 1, max: 2, vMax: 1}, power: 0, area: 1}
})

describe('world', () => {

    it('should find the shortest path between two locations', () => {
        const worldMap = initWorldMap(10)

        const pathFinder = pathFinderManager.getShortestPath(worldMap, {x: 0, y: 1, z: 0}, {x: 5, y: 1, z: 5})
        const result = pathFinder.find()

        expect(result.path?.length).toBe(11)
    })

    it('should select a unit and move it', () => {
        const worldMap = initWorldMap(10)
        const player: Player = {id: 1, name: "P1", color: '#ff0000'}
        const world = new World(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)

        world.moveUnit(world.units[0], {x: 5, z: 5})

        expect(world.getPosition(world.units[0])).toEqual({x: 5, y: 1, z: 5})
    })

    it('should take into account forbidden positions', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000'}
        const world = new World(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)
            .addUnit(aUnit(), {x: 0, z: 1}, player)

        const positions = world.getReachablePositions(world.units[0])

        expect(positions).not.toContainEqual({x: 0, y: 2, z: 1})
    })

    it('should get reachable positions for a given unit', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000'}
        const world = new World(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)

        const positions = world.getReachablePositions(world.units[0])

        expect(positions.length).toBe(3)
        expect(positions).toContainEqual({x: 0, y: 2, z: 1})
        expect(positions).toContainEqual({x: 2, y: 2, z: 1})
        expect(positions).toContainEqual({x: 1, y: 2, z: 2})
    })

    it('should get reachable positions for a given weapon', () => {
        const worldMap = initWorldMap(3, [[0, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000'}
        const world = new World(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)

        const positions = world.getReachablePositionsForWeapon(world.units[0])

        expect(positions.length).toBe(7)
        expect(positions).toContainEqual({x: 0, y: 1, z: 0})
        expect(positions).toContainEqual({x: 0, y: 2, z: 1})
        expect(positions).toContainEqual({x: 0, y: 2, z: 2})
        expect(positions).toContainEqual({x: 1, y: 2, z: 2})
        expect(positions).toContainEqual({x: 2, y: 2, z: 0})
        expect(positions).toContainEqual({x: 2, y: 2, z: 1})
        expect(positions).toContainEqual({x: 2, y: 2, z: 2})
    })
})