import {EdgeFilter, Graph, PathFinder, PositionMapping} from "../algorithm/path-finder"
import {WorldMapPort} from "./ports"

const getCandidates = <N, K>(graph: Graph<N, K>, start: N, startCost: number, filter?: EdgeFilter<N>) => {
    let candidates = graph.getNeighbours(start)
    if (filter) {
        candidates = candidates.filter(neighbour => filter(start, neighbour))
    }
    return candidates.map(value => ({
        node: value,
        cost: startCost + graph.costBetween(start, value)
    }))
}

export class WorldMapService<N, K> implements WorldMapPort<N, K> {

    getShortestPathFromPosition<P>(graph: Graph<N, K>, getClosestNode: PositionMapping<P, N>, start: P, end: P): PathFinder<N, K> {
        const startNode = getClosestNode(start)
        const endNode = getClosestNode(end)
        return new PathFinder(graph, startNode, endNode)
    }

    getShortestPath(graph: Graph<N, K>, startNode: N, endNode: N, filter?: EdgeFilter<N>): PathFinder<N, K> {
        return new PathFinder(graph, startNode, endNode, filter)
    }

    getAccessibleNodes(graph: Graph<N, K>, start: N, minCost: number, maxCost: number, filter?: EdgeFilter<N>): N[] {
        const accessiblePositions: N[] = []
        const tested: N[] = []
        const candidates = [{node: start, cost: 0}]
        let n = 0
        while (candidates.length > 0) {
            const candidate = candidates.shift()!
            const nodeKey = graph.getNodeKey(candidate.node)
            const isAlreadyTested = tested.find(node => nodeKey === graph.getNodeKey(node))
            if (candidate.cost <= maxCost && !isAlreadyTested) {
                tested.push(candidate.node)
                if (candidate.cost >= minCost) {
                    accessiblePositions.push(candidate.node)
                }
                const newCandidates = getCandidates(graph, candidate.node, candidate.cost, filter)
                candidates.push(...newCandidates)
            }
            n++
        }

        return accessiblePositions
    }
}