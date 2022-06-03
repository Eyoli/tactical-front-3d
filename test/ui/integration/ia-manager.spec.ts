import {aGameWithFlatWorldAndTwoPlayers, gameViewMock} from "../../common";
import {IAManager} from "../../../src/ui/models/ia";
import {GameManager} from "../../../src/ui/models/game-manager";
import {ActionType} from "../../../src/domain/models/ia";
import {UnitSelectionEvent} from "../../../src/ui/models/types";
import {AttackAction} from "../../../src/domain/models/actions";

const gameView = gameViewMock()

describe('IA manager', () => {

    it('should handle a turn with movement and action', async () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit1 = game.units[0]
        const unit2 = game.units[1]
        const gameManager = new GameManager(game, gameView)
        const iaMa = new IAManager(gameManager, 0)
        const actions = [
            {
                type: "attack" as ActionType,
                action: new AttackAction(unit1),
                position: {x: 1, y: 2, z: 2},
            },
            {
                type: "move" as ActionType,
                position: {x: 2, y: 1, z: 1}
            },
        ]

        // select unit 1
        await gameManager.handleEvent(new UnitSelectionEvent(unit1))

        await iaMa.handleTurn(actions.values())

        expect(game.getState(unit1)).toMatchObject({
            position: {x: 2, y: 2, z: 1}
        })
        expect(game.getState(unit2)).toMatchObject({
            hp: 9
        })
    })
})
