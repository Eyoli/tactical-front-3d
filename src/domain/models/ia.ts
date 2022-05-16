import {Action, Position3D} from "./types"

export type ActionType = 'move' | 'attack'

export type ActionDetail = {
    type: ActionType
    position: Position3D
    action?: Action
}

export type Turn = {
    actions: IterableIterator<ActionDetail>
}