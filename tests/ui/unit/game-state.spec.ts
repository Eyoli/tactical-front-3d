import {aGameWithFlatWorldAndTwoPlayers, gameViewMock} from "../../common";
import {NothingSelectedState} from "../../../src/ui/models/states/nothing-selected";
import {ActionEvent, PositionSelectionEvent, STATES, UnitSelectionEvent} from "../../../src/ui/models/types";
import {UnitSelectedState} from "../../../src/ui/models/states/unit-selected";
import {MoveSelectionState} from "../../../src/ui/models/states/move-selection";

const mock = gameViewMock()

describe('Game state', () => {

    describe('Nothing selected', () => {
        it('should proceed to unit selected state when selecting a unit', async () => {
            const game = aGameWithFlatWorldAndTwoPlayers()
            const unit = game.units[0]
            const newState = await new NothingSelectedState(game, mock)
                .handleEvent(new UnitSelectionEvent(unit))

            expect(newState).toMatchObject({
                name: STATES.UNIT_SELECTED,
                selectedUnit: unit,
            })
        })
    })

    describe('Unit selected', () => {
        it('should proceed to move selection state when triggering move action', async () => {
            const game = aGameWithFlatWorldAndTwoPlayers()
            const unit = game.units[0]
            const newState = await new UnitSelectedState(game, mock, unit)
                .handleEvent(new ActionEvent("move"))

            expect(newState).toMatchObject({
                name: STATES.MOVE_SELECTION,
                selectedUnit: unit,
            })
        })

        it('should proceed to action target selection state when triggering attack action', async () => {
            const game = aGameWithFlatWorldAndTwoPlayers()
            const unit = game.units[0]
            const newState = await new UnitSelectedState(game, mock, unit)
                .handleEvent(new ActionEvent("attack"))

            expect(newState).toMatchObject({
                name: STATES.ACTION_TARGET_SELECTION,
                selectedUnit: unit,
                selectedAction: {
                    source: unit,
                },
            })
        })
    })

    describe('Move selection', () => {
        it('should proceed to unit selected state when selecting valid position with selected unit', async () => {
            const game = aGameWithFlatWorldAndTwoPlayers()
            const unit = game.units[0]
            const newState = await new MoveSelectionState(game, mock, unit)
                .handleEvent(new PositionSelectionEvent({x: 0, y: 1, z: 1}))

            expect(newState).toMatchObject({
                name: STATES.UNIT_SELECTED,
                selectedUnit: unit,
            })
        })

        it('should proceed to nothing selected state when selecting the selected unit', async () => {
            const game = aGameWithFlatWorldAndTwoPlayers()
            const unit = game.units[0]
            const newState = await new MoveSelectionState(game, mock, unit)
                .handleEvent(new UnitSelectionEvent(unit))

            expect(newState).toMatchObject({
                name: STATES.NOTHING_SELECTED,
            })
        })
    })
})
