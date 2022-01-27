import {Game} from "./model/game"
import {Action, ActionResult, Position3D, Unit} from "./model/types"
import {EdgeFilter, Graph, PathFinder, PositionMapping} from "./algorithm/path-finder"
import {Turn} from "./model/ia"

export interface GamePort {
    moveUnit(game: Game, unit: Unit, param3: { x: number; z: number }): Position3D[] | undefined
    getReachablePositions(game: Game, unit: Unit): Position3D[]
    getReachablePositionsForAction(game: Game, action: Action): Position3D[]
    executeAction(game: Game, action: Action, param3: { x: number; z: number }): void
    getPosition(game: Game, unit: Unit): Position3D
    previewAction(game: Game, _selectedAction: Action, p: Position3D): ActionResult
}

export interface WorldMapPort<N, K> {
    getShortestPathFromPosition<P>(graph: Graph<N, K>, getClosestNode: PositionMapping<P, N>, start: P, end: P): PathFinder<N, K>
    getShortestPath(graph: Graph<N, K>, startNode: N, endNode: N, filter?: EdgeFilter<N>): PathFinder<N, K>
    getAccessibleNodes(graph: Graph<N, K>, start: N, minCost: number, maxCost: number, filter?: EdgeFilter<N>): N[]
}

export interface IAPort {
    computeBestTurnActions(game: Game): Turn
}