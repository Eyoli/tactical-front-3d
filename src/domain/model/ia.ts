import {Position2D, Unit} from "./types"

export type ActionType = 'move' | 'attack'

export type ActionDetail = {
    type: ActionType
    position?: Position2D
    target?: Unit
}

export type Turn = {
    actions: IterableIterator<ActionDetail>
}