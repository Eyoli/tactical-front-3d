import {EdgeFilter, Graph, PathFinder, PositionMapping} from "../algorithm/path-finder"

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

export class WorldMapService<N, K> {

    getShortestPathFromPosition<P>(graph: Graph<N, K>, getClosestNode: PositionMapping<P, N>, start: P, end: P): PathFinder<N, K> {
        const startNode = getClosestNode(start)
        const endNode = getClosestNode(end)
        return new PathFinder(graph, startNode, endNode)
    }

    getShortestPath(graph: Graph<N, K>, startNode: N, endNode: N): PathFinder<N, K> {
        return new PathFinder(graph, startNode, endNode)
    }

    getAccessibleNodes(graph: Graph<N, K>, start: N, maxCost: number, filter?: EdgeFilter<N>): N[] {
        const accessiblePositions: N[] = []
        const candidates = getCandidates(graph, start, 0, filter)
        while (candidates.length > 0) {
            const candidate = candidates.shift()!
            if (candidate.cost <= maxCost) {
                accessiblePositions.push(candidate.node)
                const newCandidates = getCandidates(graph, candidate.node, candidate.cost, filter)
                candidates.push(...newCandidates)
            }
        }

        return accessiblePositions
    }
}