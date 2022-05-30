import {GameInputEvent, GameOutputEvent, GameViewInterface} from "./types";
import {GameState} from "./game-state";
import {NothingSelectedState} from "./states/nothing-selected";
import {Game} from "../../domain/models/game";

type GameEventCallback = (...args: any) => void

export class GameManager {
    private gameState: GameState
    private callbacks: Map<GameOutputEvent, GameEventCallback[]> = new Map()
    private frozen = false

    constructor(
        private readonly game: Game,
        private readonly gameView: GameViewInterface,
    ) {
        this.gameState = new NothingSelectedState(game, gameView)
    }

    handleEvent = (event: GameInputEvent): Promise<GameState> => {
        console.debug(`Event ${event.name} for state ${this.gameState.name}`)
        if (this.frozen) return Promise.resolve(this.gameState)

        this.frozen = true
        return this.gameState.handleEvent(event)
            .then((nextState) => {
                console.debug(`${this.gameState.name} => ${nextState.name}`)
                this.gameState = nextState
                this.frozen = false
                this.dispatch("stateChanged", nextState)

                return nextState
            })
    }

    register = (event: GameOutputEvent, callback: GameEventCallback) => {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, [])
        }
        this.callbacks.get(event)?.push(callback)
    }

    private dispatch = (event: GameOutputEvent, ...args: any) => this.callbacks.get(event)?.forEach((callback) => callback(...args))
}