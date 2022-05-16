import {GameViewInterface, GUIAction, Target} from "./types";
import {Game} from "../../domain/models/game";

export abstract class GameState {

    protected constructor(
        readonly game: Game,
        readonly gameView: GameViewInterface,
        readonly name: String,
    ) {
    }

    // Default behavior: don't react to any event
    clickOnTarget = (target: Target): Promise<GameState> => Promise.resolve(this)

    // Default behavior: don't react to any event
    triggerGUIAction = (guiAction: GUIAction): Promise<GameState> => Promise.resolve(this)
}
