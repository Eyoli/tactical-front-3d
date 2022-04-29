import {GameBuilder} from "../../src/domain/model/game"
import {Player, Unit, UnitType} from "../../src/domain/model/types"
import {IAPort} from "../../src/domain/ports"
import {IAService} from "../../src/domain/service/ia-service"
import {initWorldMap} from "../common"
import {ActionDetail} from "../../src/domain/model/ia"

const iaService: IAPort = new IAService()

export const aUnit = (id: number, type: UnitType, rangeMax: number): Unit => new Unit({
    id,
    name: "",
    type,
    moves: 1,
    jump: 1,
    hp: 10,
    weapon: {range: {min: 1, max: rangeMax, vMax: 1}, power: 1, area: 1}
})

describe('ia services', () => {

    it('should compute right actions for warrior', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]])
        const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const player2: Player = {id: 2, name: "P2", color: '#00ff00', mode: 'human'}
        const iaUnit = aUnit(1, "warrior", 1)
        const target = aUnit(2, "warrior", 1)
        const game = new GameBuilder(worldMap)
            .addPlayers(player1, player2)
            .addUnit(iaUnit, {x: 1, z: 1}, player1)
            .addUnit(target, {x: 0, z: 0}, player2)
            .start()

        const actions = iaService.computeBestTurnActions(game, iaUnit)
        const expectedMove: ActionDetail = {
            type: "move",
            position: {x: 0, z: 1}
        }

        // Start by moving closer to the target
        expect(actions.actions.next().value).toStrictEqual(expectedMove)

        // Then attack the target
        const attack: ActionDetail = actions.actions.next().value
        expect(attack.type).toStrictEqual("attack")
        expect(attack.position).toStrictEqual({x: 0, z: 0})

        // No further action to iterate over
        expect(actions.actions.next().done).toBe(true)
    })

    it('should compute right actions for archer', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]])
        const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const player2: Player = {id: 2, name: "P2", color: '#00ff00', mode: 'human'}
        const iaUnit = aUnit(1, "archer", 2)
        const target = aUnit(2, "warrior", 1)
        const game = new GameBuilder(worldMap)
            .addPlayers(player1, player2)
            .addUnit(iaUnit, {x: 1, z: 1}, player1)
            .addUnit(target, {x: 0, z: 0}, player2)
            .start()

        const actions = iaService.computeBestTurnActions(game, iaUnit)

        // Start by attacking the target
        const attack = actions.actions.next().value
        expect(attack.type).toStrictEqual("attack")
        expect(attack.position).toStrictEqual({x: 0, z: 0})

        // No further action to iterate over
        expect(actions.actions.next().done).toBe(true)
    })
})