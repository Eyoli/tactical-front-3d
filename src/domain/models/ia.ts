import {Position3D} from "./types"
import {Action} from "./actions";

export type ActionType = 'move' | 'attack'

export type ActionDetail = {
    type: ActionType
    position: Position3D
    action?: Action
}

export type Turn = {
    actions: IterableIterator<ActionDetail>
}