export type Graph<N, K> = {
    getNeighbours(node: N): N[]

    getNodeKey(node: N): K

    costBetween(node: N, neighbour: N): number

    distanceBetween(node1: N, node2: N): number
}

export type Path<N> = {
    path: N[] | undefined
    cost: number
}

class NodeState<N> {
    tested: boolean
    cost: number
    previous: N | null

    constructor() {
        this.tested = false
        this.cost = Infinity
        this.previous = null
    }
}

type PositionMapping<P, N> = (p: P) => N
type EdgeFilter<N> = (n1: N, n2: N) => boolean

class PathFinder<N, K> {
    readonly graph: Graph<N, K>
    readonly startNode: N
    readonly endNode: N
    private readonly nodesState: Map<K, NodeState<N>>
    private neighbourFilter?: EdgeFilter<N>

    constructor(graph: Graph<N, K>, startNode: N, endNode: N) {
        this.graph = graph
        this.startNode = startNode
        this.endNode = endNode
        this.nodesState = new Map()
    }

    withNeighbourFilter(filter: EdgeFilter<N>): PathFinder<N, K> {
        this.neighbourFilter = filter
        return this
    }

    private getNodeState(node: N) {
        const key = this.graph.getNodeKey(node)
        let state = this.nodesState.get(key)
        if (!state) {
            state = new NodeState()
            this.nodesState.set(key, state)
        }
        return state
    }

    find(maxIterations: number = 100): Path<N> {
        const endNodeKey = this.graph.getNodeKey(this.endNode)

        let currentNode = this.startNode
        this.getNodeState(currentNode).cost = 0
        const candidates: N[] = []

        // console.log('from', this.startNode)
        // console.log('to', this.endNode)

        let i = 0
        while (currentNode
        && this.graph.getNodeKey(currentNode) !== endNodeKey
        && i < maxIterations) {
            i++
            // console.log('node', currentNode, i)

            const currentNodeState = this.getNodeState(currentNode)
            currentNodeState.tested = true
            const cost = currentNodeState.cost

            let neighbours = this.graph.getNeighbours(currentNode)
            if (this.neighbourFilter) {
                neighbours = neighbours.filter(this.neighbourFilter.bind(this, currentNode))
            }
            // console.log('neighbours: ', neighbours);

            for (const neighbour of neighbours) {
                const state = this.getNodeState(neighbour)
                const costToNode = this.graph.costBetween(currentNode, neighbour)
                if (!state.tested) {
                    if (state.cost === Infinity) {
                        candidates.push(neighbour)
                    }
                    if (state.cost > cost + costToNode) {
                        state.cost = cost + costToNode
                        state.previous = currentNode
                    }
                }
            }

            // console.log('candidates: ', candidates)

            let nextEstimatedCost = Infinity
            let nextIndex = 0

            candidates.forEach((candidate, i) => {
                const state = this.getNodeState(candidate)
                const estimatedCost = state.cost + this.graph.distanceBetween(candidate, this.endNode)
                if (nextEstimatedCost > estimatedCost) {
                    nextEstimatedCost = estimatedCost
                    nextIndex = i
                }
            })

            const candidate = candidates.splice(nextIndex, 1)
            currentNode = candidate[0]
        }

        if (currentNode && i < maxIterations) {
            const totalCost = this.getNodeState(currentNode).cost
            const shortestPath = []
            shortestPath.push(currentNode)

            let state = this.getNodeState(currentNode)
            while (state.previous) {
                shortestPath.unshift(state.previous)
                state = this.getNodeState(state.previous)
            }

            // console.log(shortestPath, totalCost)

            return {path: shortestPath, cost: totalCost}
        }

        return {path: undefined, cost: Infinity}
    }
}

export class PathFinderManager<N, K> {

    getShortestPathFromPosition<P>(graph: Graph<N, K>, getClosestNode: PositionMapping<P, N>, start: P, end: P): PathFinder<N, K> {
        const startNode = getClosestNode(start)
        const endNode = getClosestNode(end)
        return new PathFinder(graph, startNode, endNode)
    }

    getShortestPath(graph: Graph<N, K>, startNode: N, endNode: N): PathFinder<N, K> {
        return new PathFinder(graph, startNode, endNode)
    }
}