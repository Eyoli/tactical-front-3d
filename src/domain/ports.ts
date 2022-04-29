import {Game} from "./model/game"
import {Unit} from "./model/types"
import {Turn} from "./model/ia"

export interface IAPort {
    computeBestTurnActions(game: Game, unit: Unit): Turn
}