import {aGameWithFlatWorldAndTwoPlayers, gameViewMock} from "../../common";
import {GameManager} from "../../../src/ui/models/game-manager";
import {ActionEvent, PositionSelectionEvent, UnitSelectionEvent} from "../../../src/ui/models/types";

const mock = gameViewMock()

describe('Game manager', () => {

    it('should handle a turn with movement and action', async () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit1 = game.units[0]
        const unit2 = game.units[1]

        const gameManager = new GameManager(game, mock)

        await gameManager
            // select unit 1
            .handleEvent(new UnitSelectionEvent(unit1))
            // select attack action
            .then(() => gameManager.handleEvent(new ActionEvent("attack")))
            // target unit 2
            .then(() => gameManager.handleEvent(new PositionSelectionEvent({x: 1, y: 2, z: 2})))
            // confirm action
            .then(() => gameManager.handleEvent(new PositionSelectionEvent({x: 1, y: 2, z: 2})))
            // select move action
            .then(() => gameManager.handleEvent(new ActionEvent("move")))
            // select a valid position on the map
            .then(() => gameManager.handleEvent(new PositionSelectionEvent({x: 2, y: 1, z: 1})))

        expect(game.getState(unit1)).toMatchObject({
            position: {x: 2, y: 2, z: 1}
        })
        expect(game.getState(unit2)).toMatchObject({
            hp: 9
        })
    })
})
