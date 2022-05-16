import {GameBuilder} from "../../../src/domain/models/game"
import {Player} from "../../../src/domain/models/types"
import {IAPort} from "../../../src/domain/ports"
import {IAService} from "../../../src/domain/services/ia-service"
import {aUnit, initWorldMap} from "../../common"
import {ActionDetail} from "../../../src/domain/models/ia"

const iaService: IAPort = new IAService()


describe('ia services', () => {

    it('should compute right actions for warrior', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]])
        const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const player2: Player = {id: 2, name: "P2", color: '#00ff00', mode: 'human'}
        const iaUnit = aUnit(1)
        const target = aUnit(2)
        const game = new GameBuilder(worldMap)
            .addPlayers(player1, player2)
            .addUnit(iaUnit, {x: 1, z: 1}, player1)
            .addUnit(target, {x: 0, z: 0}, player2)
            .start()

        const actions = iaService.computeBestTurnActions(game, iaUnit)
        const expectedMove: ActionDetail = {
            type: "move",
            position: {x: 0, y: 1, z: 1}
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
        const iaUnit = aUnit(1, "archer", 1, 1, 2)
        const target = aUnit(2)
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