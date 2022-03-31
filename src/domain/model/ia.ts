import {Action, Position2D, Unit} from "./types"

export type ActionType = 'move' | 'attack'

export type ActionDetail = {
    type: ActionType
    position: Position2D
    action?: Action
}

export type Turn = {
    actions: IterableIterator<ActionDetail>
}