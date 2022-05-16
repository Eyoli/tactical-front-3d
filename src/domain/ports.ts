import {Game} from "./models/game"
import {Unit} from "./models/types"
import {Turn} from "./models/ia"

export interface IAPort {
    computeBestTurnActions(game: Game, unit: Unit): Turn
}