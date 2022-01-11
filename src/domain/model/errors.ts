import {Unit} from "./types"

export const UNIT_CANNOT_MOVE = "Impossible to move unit: cannot move"
export const UNIT_CANNOT_REACH_POSITION = "Impossible to move unit: unreachable position"
export const UNIT_WITHOUT_STATE = (unit: Unit) => `Unit (id=${unit.id}) without state`

export const PLAYER_NOT_ADDED_BEFORE_UNIT = "Add the player before adding a unit"

export const ACTION_CANNOT_REACH_TARGET = "Action impossible: target not in range"