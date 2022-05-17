import {GameInputEvent, GameViewInterface} from "./types";
import {Game} from "../../domain/models/game";

export abstract class GameState {

    protected constructor(
        readonly game: Game,
        readonly gameView: GameViewInterface,
        readonly name: String,
    ) {
    }

    // Default behavior: don't react to any event
    handleEvent = (target: GameInputEvent): Promise<GameState> => Promise.resolve(this)
}
