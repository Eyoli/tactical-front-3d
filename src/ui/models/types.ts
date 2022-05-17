import {ActionResult, Position3D, Unit, UnitState} from "../../domain/models/types"

export type Target = {
    position?: Position3D,
    unit?: Unit
}

export interface GameViewInterface {

    select(unit: Unit, position: Position3D): void

    unselect(): void

    selectMoveAction(unit: Unit, reachablePositions: Position3D[]): void

    moveSelectedUnitAlong(selectedUnit: Unit, state: UnitState, path: Position3D[]): Promise<void>

    selectAction(unit: Unit, reachablePositions: Position3D[]): void

    previewAction(unit: Unit, state: UnitState, actionResult: ActionResult, position: Position3D): void

    executeAction(unit: Unit, state: UnitState, actionResult: ActionResult, position: Position3D): Promise<void>
}

export type GUIAction = 'move' | 'attack' | "end"
export type GameOutputEvent = 'stateChanged'
export const STATES = {
    NOTHING_SELECTED: 'NOTHING_SELECTED',
    UNIT_SELECTED: 'UNIT_SELECTED',
    ACTION_TARGET_SELECTION: 'ACTION_TARGET_SELECTION',
    ACTION_PREVIEWED: 'ACTION_PREVIEWED',
    MOVE_SELECTION: 'MOVE_SELECTION',
    WAITING: 'WAITING',
}

export abstract class GameInputEvent {
    protected constructor(
        readonly name: String
    ) {
    }
}

export class UnitSelectionEvent extends GameInputEvent {
    constructor(
        readonly unit: Unit
    ) {
        super("UnitSelectionEvent")
    }
}

export class PositionSelectionEvent extends GameInputEvent {
    constructor(
        readonly position: Position3D
    ) {
        super("PositionSelectionEvent")
    }
}

export class CancelEvent extends GameInputEvent {
    constructor() {
        super("CancelEvent");
    }
}

export class ActionEvent extends GameInputEvent {
    constructor(
        readonly action: GUIAction
    ) {
        super("ActionEvent")
    }
}