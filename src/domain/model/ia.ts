import {Position2D} from "./types"

export type ActionType = 'move' | 'attack'

export type ActionDetail = {
    type: ActionType
    target: Position2D
}

export type Turn = {
    actions: ActionDetail[]
}