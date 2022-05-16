import {aGameWithFlatWorldAndTwoPlayers} from "../../common";
import {NothingSelectedState} from "../../../src/ui/models/states/nothing-selected";
import {GameViewInterface, STATES} from "../../../src/ui/models/types";
import {UnitSelectedState} from "../../../src/ui/models/states/unit-selected";
import {MoveSelectionState} from "../../../src/ui/models/states/move-selection";

const gameViewMock: GameViewInterface = {
    executeAction: jest.fn(() => Promise.resolve()),
    moveSelectedUnitAlong: jest.fn(() => Promise.resolve()),
    previewAction: jest.fn(),
    select: jest.fn(),
    selectAction: jest.fn(),
    selectMoveAction: jest.fn(),
    unselect: jest.fn(),
}

describe('Game state', () => {

    it('should proceed to unit selected state when selecting a unit', async () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit = game.units[0]
        const newState = await new NothingSelectedState(game, gameViewMock)
            .clickOnTarget({unit})

        expect(newState).toMatchObject({
            name: STATES.UNIT_SELECTED,
            selectedUnit: unit,
        })
    })

    it('should proceed to move selection state when triggering action', async () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit = game.units[0]
        const newState = await new UnitSelectedState(game, gameViewMock, unit)
            .triggerGUIAction("move")

        expect(newState).toMatchObject({
            name: STATES.MOVE_SELECTION,
            selectedUnit: unit,
        })
    })

    it('should proceed to unit selected state when selecting valid position with selected unit', async () => {
        const game = aGameWithFlatWorldAndTwoPlayers()
        const unit = game.units[0]
        const newState = await new MoveSelectionState(game, gameViewMock, unit)
            .clickOnTarget({position: {x: 0, y: 1, z: 1}})

        expect(newState).toMatchObject({
            name: STATES.UNIT_SELECTED,
            selectedUnit: unit,
        })
    })
})
