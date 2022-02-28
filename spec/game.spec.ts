import {GameBuilder} from "../src/domain/model/game"
import {AttackAction, Player, Unit} from "../src/domain/model/types"
import {WorldMapService} from "../src/domain/service/world-map-service"
import {UNIT_CANNOT_MOVE} from "../src/domain/model/errors"
import {GameService} from "../src/domain/service/game-service"
import {GamePort} from "../src/domain/ports"
import {initWorldMap} from "./common"

const worldMapService = new WorldMapService()
const gameService: GamePort = new GameService()

const aUnit = (): Unit => new Unit({
    id: 1, name: "", type: "warrior", moves: 1, jump: 1, hp: 10, weapon: {range: {min: 1, max: 2, vMax: 1}, power: 1, area: 1}
})

const aGameWithFlatWorldAndTwoPlayers = () => {
    const worldMap = initWorldMap(3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]])
    const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
    const player2: Player = {id: 1, name: "P2", color: '#00ff00', mode: 'human'}
    return new GameBuilder(worldMap)
        .addPlayers(player1, player2)
        .addUnit(aUnit(), {x: 1, z: 1}, player1)
        .addUnit(aUnit(), {x: 1, z: 2}, player2)
        .start()
}

describe('game', () => {

    it('should find the shortest path between two locations', () => {
        const worldMap = initWorldMap(10)

        const pathFinder = worldMapService.getShortestPath(worldMap, {x: 0, y: 1, z: 0}, {x: 5, y: 1, z: 5})
        const result = pathFinder.find()

        expect(result.path?.length).toBe(11)
    })

    it('should select a unit and move it', () => {
        const worldMap = initWorldMap(10)
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)
            .start()

        gameService.moveUnit(game, game.units[0], {x: 1, z: 2})

        const state = game.getState(game.units[0])
        expect(state.position).toStrictEqual({x: 1, y: 1, z: 2})
        expect(state.canMove).toStrictEqual(false)
    })

    it('should take into account forbidden positions', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)
            .addUnit(aUnit(), {x: 0, z: 1}, player)
            .start()

        const positions = gameService.getReachablePositions(game, game.units[0])

        expect(positions).not.toContainEqual({x: 0, y: 2, z: 1})
    })

    it('should get reachable positions for a given unit', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)
            .start()

        const positions = gameService.getReachablePositions(game, game.units[0])

        expect(positions.length).toBe(3)
        expect(positions).toContainEqual({x: 0, y: 2, z: 1})
        expect(positions).toContainEqual({x: 2, y: 2, z: 1})
        expect(positions).toContainEqual({x: 1, y: 2, z: 2})
    })

    it('should get reachable positions for a given action', () => {
        const worldMap = initWorldMap(3, [[0, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(), {x: 1, z: 1}, player)
            .start()

        const positions = gameService.getReachablePositionsForAction(game, new AttackAction(game.units[0]))

        expect(positions.length).toBe(7)
        expect(positions).toContainEqual({x: 0, y: 1, z: 0})
        expect(positions).toContainEqual({x: 0, y: 2, z: 1})
        expect(positions).toContainEqual({x: 0, y: 2, z: 2})
        expect(positions).toContainEqual({x: 1, y: 2, z: 2})
        expect(positions).toContainEqual({x: 2, y: 2, z: 0})
        expect(positions).toContainEqual({x: 2, y: 2, z: 1})
        expect(positions).toContainEqual({x: 2, y: 2, z: 2})
    })

    it('should execute an action on a target', () => {
        const game = aGameWithFlatWorldAndTwoPlayers()

        gameService.executeAction(game, new AttackAction(game.units[0]), {x: 1, z: 2})

        expect(game.getState(game.units[0]).hp).toEqual(10)
        expect(game.getState(game.units[1]).hp).toEqual(9)
    })

    it('should manage correctly the ability to move', () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit1 = game.units[0]
        const unit2 = game.units[1]

        expect(game.getState(unit1).canMove).toEqual(true)
        expect(game.getState(unit2).canMove).toEqual(false)

        gameService.moveUnit(game, unit1, {x: 1, z: 0})
        expect(game.getState(unit1).canMove).toEqual(false)
        expect(game.getState(unit2).canMove).toEqual(false)
        expect(() => gameService.moveUnit(game, unit1, {x: 0, z: 2})).toThrow(UNIT_CANNOT_MOVE)
        expect(() => gameService.moveUnit(game, unit2, {x: 0, z: 2})).toThrow(UNIT_CANNOT_MOVE)

        game.nextTurn()
        expect(game.getState(unit1).canMove).toEqual(false)
        expect(game.getState(unit2).canMove).toEqual(true)
        expect(() => gameService.moveUnit(game, unit1, {x: 0, z: 2})).toThrow(UNIT_CANNOT_MOVE)

        gameService.moveUnit(game, unit2, {x: 0, z: 2})
        expect(game.getState(unit1).canMove).toEqual(false)
        expect(game.getState(unit2).canMove).toEqual(false)
        expect(() => gameService.moveUnit(game, unit1, {x: 0, z: 2})).toThrow(UNIT_CANNOT_MOVE)
        expect(() => gameService.moveUnit(game, unit2, {x: 0, z: 2})).toThrow(UNIT_CANNOT_MOVE)

        game.nextTurn()
        expect(game.getState(unit1).canMove).toEqual(true)
        expect(game.getState(unit2).canMove).toEqual(false)
    })
})