import {Position2D} from "./types"

export type ActionType = 'move' | 'attack'

export type ActionDetail = {
    target: Position2D
}

export type Turn = {
    actions: ActionType[],
    actionsDetails: ActionDetail[]
}