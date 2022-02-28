import {GameBuilder} from "../src/domain/model/game"
import {Player, Unit} from "../src/domain/model/types"
import {IAPort} from "../src/domain/ports"
import {IAService} from "../src/domain/service/ia-service"
import {initWorldMap} from "./common"
import {ActionDetail} from "../src/domain/model/ia"

const iaService: IAPort = new IAService()

export const aUnit = (): Unit => new Unit({
    id: 1,
    name: "",
    type: "warrior",
    moves: 1,
    jump: 1,
    hp: 10,
    weapon: {range: {min: 1, max: 2, vMax: 1}, power: 1, area: 1}
})

describe('ia services', () => {

    it('should compute right actions for warrior', () => {
        const worldMap = initWorldMap(3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]])
        const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
        const player2: Player = {id: 2, name: "P2", color: '#00ff00', mode: 'human'}
        const unit = aUnit()
        const game = new GameBuilder(worldMap)
            .addPlayers(player1, player2)
            .addUnit(unit, {x: 1, z: 1}, player1)
            .addUnit(aUnit(), {x: 0, z: 0}, player2)
            .start()

        const actions = iaService.computeBestTurnActions(game, unit)
        const expectedMove: ActionDetail = {
            type: "move",
            position: {x: 1, z: 0}
        }
        const expectedAttack: ActionDetail = {
            type: "attack",
            position: {x: 0, z: 0}
        }

        // Start by moving close to the target
        expect(actions.actions.next().value).toStrictEqual(expectedMove)

        // Then attack the target
        expect(actions.actions.next().value).toStrictEqual(expectedAttack)

        // No further action to iterate over
        expect(actions.actions.next().done).toBe(true)
    })
})