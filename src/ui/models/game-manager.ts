import {GameEvent, GameViewInterface, GUIAction, Target} from "./types";
import {GameState} from "./game-state";
import {NothingSelectedState} from "./states/nothing-selected";
import {Game} from "../../domain/models/game";

type GameEventCallback = (...args: any) => void

export class GameManager {
    private gameState: GameState
    private callbacks: Map<GameEvent, GameEventCallback> = new Map()
    private frozen = false

    constructor(
        private readonly game: Game,
        private readonly gameView: GameViewInterface,
    ) {
        this.gameState = new NothingSelectedState(game, gameView)
    }

    clickOnTarget = (target: Target): Promise<GameState> => {
        if (this.frozen) return Promise.reject()

        this.frozen = true
        return this.gameState.clickOnTarget(target)
            .then((nextState) => {
                console.debug(`${this.gameState.name} => ${nextState.name}`)
                this.gameState = nextState
                this.frozen = false
                this.callbacks.get('stateChanged')?.call(null, nextState)

                return nextState
            })
    }

    triggerGUIAction = (guiAction: GUIAction): Promise<GameState> => {
        if (this.frozen) return Promise.reject()

        this.frozen = true
        return this.gameState.triggerGUIAction(guiAction)
            .then((nextState) => {
                console.debug(`${this.gameState.name} => ${nextState.name}`)
                this.gameState = nextState
                this.frozen = false
                this.callbacks.get('stateChanged')?.call(null, nextState)

                return nextState
            })
    }

    on = (event: GameEvent, callback: GameEventCallback) => {
        this.callbacks.set(event, callback)
    }
}