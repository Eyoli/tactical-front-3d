import {Game, GameBuilder} from "../../../src/domain/models/game"
import {AttackAction, Player, Unit} from "../../../src/domain/models/types"
import {UNIT_CANNOT_MOVE} from "../../../src/domain/models/errors"
import {aGameWithFlatWorldAndTwoPlayers, aUnit, initWorldMap} from "../../common"

describe('Game', () => {

    it('should select a unit and move it', () => {
        const worldMap = initWorldMap(10)
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const unit = aUnit(1)
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(unit, {x: 1, z: 1}, player)
            .start()

        game.moveUnit(unit, {x: 1, z: 2})

        const state = game.getState(unit)
        expect(state.position).toStrictEqual({x: 1, y: 1, z: 2})
        expectUnitToNotBeAbleToMove(unit, game)
    })

    it('should take into account forbidden positions', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const unit1 = aUnit(1, "warrior", 10)
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(unit1, {x: 1, z: 1}, player)
            .addUnit(aUnit(2), {x: 0, z: 1}, player)
            .start()

        const positions = game.getReachablePositions(unit1)

        expect(positions).toMatchObject([
            {x: 2, y: 2, z: 1},
            {x: 1, y: 2, z: 2},
            {x: 2, y: 2, z: 0},
            {x: 2, y: 2, z: 2},
            {x: 0, y: 2, z: 2},
            {x: 1, y: 3, z: 0},
            {x: 0, y: 2, z: 0}
        ])
    })

    it('should get reachable positions for a given unit', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(1), {x: 1, z: 1}, player)
            .start()

        const positions = game.getReachablePositions(game.units[0])

        expect(positions).toMatchObject([
            {x: 0, y: 2, z: 1},
            {x: 2, y: 2, z: 1},
            {x: 1, y: 2, z: 2},
        ])
    })

    it('should get reachable positions for a given action', () => {
        const worldMap = initWorldMap(3, [[0, 1, 1], [2, 0, 1], [1, 1, 1]])
        const player: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const game = new GameBuilder(worldMap)
            .addPlayers(player)
            .addUnit(aUnit(1, "archer", 1, 1, 10), {x: 1, z: 1}, player)
            .start()

        const positions = game.getReachablePositionsForAction(new AttackAction(game.units[0]))

        expect(positions).toMatchObject([
            {x: 0, y: 2, z: 1},
            {x: 2, y: 2, z: 1},
            {x: 1, y: 2, z: 2},
            {x: 0, y: 1, z: 0},
            {x: 0, y: 2, z: 2},
            {x: 2, y: 2, z: 0},
            {x: 2, y: 2, z: 2},
            {x: 1, y: 3, z: 0},
        ])
    })

    it('should execute an action on a target', () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit1 = game.units[0]
        const unit2 = game.units[1]

        game.executeAction(new AttackAction(unit1), {x: 1, z: 2})

        expect(game.getState(unit1).hp).toEqual(10)
        expect(game.getState(unit2).hp).toEqual(9)
    })

    it('should manage correctly the ability to move', () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit1 = game.units[0]
        const unit2 = game.units[1]

        expectUnitToBeAbleToMove(unit1, game)
        expectUnitToNotBeAbleToMove(unit2, game)

        game.moveUnit(unit1, {x: 1, z: 0})
        expectUnitToNotBeAbleToMove(unit1, game)
        expectUnitToNotBeAbleToMove(unit2, game)
        expect(() => game.moveUnit(unit1, {x: 0, z: 2})).toThrow(UNIT_CANNOT_MOVE)
        expect(() => game.moveUnit(unit2, {x: 0, z: 2})).toThrow(UNIT_CANNOT_MOVE)

        game.nextTurn()
        expectUnitToNotBeAbleToMove(unit1, game)
        expectUnitToBeAbleToMove(unit2, game)

        game.moveUnit(unit2, {x: 0, z: 2})
        expectUnitToNotBeAbleToMove(unit1, game)
        expectUnitToNotBeAbleToMove(unit2, game)

        game.nextTurn()
        expectUnitToBeAbleToMove(unit1, game)
        expectUnitToNotBeAbleToMove(unit2, game)
    })
})

const expectUnitToNotBeAbleToMove = (unit: Unit, game: Game) => expect(game.getState(unit).canMove).toEqual(false)
const expectUnitToBeAbleToMove = (unit: Unit, game: Game) => expect(game.getState(unit).canMove).toEqual(true)