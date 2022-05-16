import GUI from "lil-gui"
import {Unit, UnitState} from "../domain/models/types"
import {Camera, Scene} from "three";
import {GameManager} from "./models/game-manager";

export class TacticalGUI {

    private readonly scene: Scene
    private unitGUI?: GUI
    private actionsGUI?: GUI

    constructor(
        private readonly camera: Camera,
        private readonly gameManager: GameManager,
    ) {
        this.scene = new Scene()
        this.actionsGUI = new GUI({title: "Actions"})
    }

    unselectUnit = () => {
        this.unitGUI?.destroy()
        this.actionsGUI?.destroy()
    }

    showUnitState = (unit: Unit, state: UnitState) => {
        console.log('Update unit state', unit, state)

        if (unit) {
            this.unitGUI?.destroy()
            this.unitGUI = new GUI({title: unit.name})
            this.unitGUI?.domElement.style.setProperty('top', '20px')

            this.unitGUI.add(unit, 'jump')
            this.unitGUI.add(unit, 'moves')
            this.unitGUI.add(state, 'hp', 0, unit.hp)
            this.unitGUI.add(state.position, 'x')
            this.unitGUI.add(state.position, 'y')
            this.unitGUI.add(state.position, 'z')
        }
    }

    showUnitActions = (state: UnitState, isActiveUnit: boolean) => {
        if (isActiveUnit) {
            this.actionsGUI?.destroy()
            this.actionsGUI = new GUI({title: 'Actions'})
            this.actionsGUI?.domElement.style.setProperty('top', '250px')

            if (state.canMove) {
                this.actionsGUI?.add(this, 'move').name('Move')
            }

            if (state.canAct) {
                this.actionsGUI?.add(this, 'attack').name('Attack')
            }

            this.actionsGUI?.add(this, 'endTurn').name('End turn')
        }
    }

    move = async () => {
        await this.gameManager.triggerGUIAction("move")
    }

    attack = async () => {
        await this.gameManager.triggerGUIAction("attack")
    }

    endTurn = async () => {
        await this.gameManager.triggerGUIAction("end")
    }
}