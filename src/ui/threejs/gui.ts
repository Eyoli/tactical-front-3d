import GUI from "lil-gui"
import {Unit, UnitState} from "../../domain/models/types"
import {Camera, Scene} from "three";
import {GameManager} from "../models/game-manager";
import {ActionEvent, STATES} from "../models/types";
import {UnitSelectedState} from "../models/states/unit-selected";
import {GameState} from "../models/game-state";

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

    update(gameState: GameState) {
        if (gameState instanceof UnitSelectedState) {
            const selectedUnit = gameState.selectedUnit
            const selectedUnitState = gameState.game.getState(selectedUnit)
            this.showUnitState(selectedUnit, selectedUnitState)
            this.showUnitActions(selectedUnitState, selectedUnit === gameState.game.getActiveUnit())
        }
        if (gameState.name === STATES.NOTHING_SELECTED) {
            this.unselectUnit()
        }
    }

    unselectUnit = () => {
        this.unitGUI?.destroy()
        this.actionsGUI?.destroy()
    }

    move = async () => {
        await this.gameManager.handleEvent(new ActionEvent("move"))
    }

    attack = async () => {
        await this.gameManager.handleEvent(new ActionEvent("attack"))
    }

    endTurn = async () => {
        await this.gameManager.handleEvent(new ActionEvent("end"))
    }

    private showUnitState = (unit: Unit, state: UnitState) => {
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

    private showUnitActions = (state: UnitState, isActiveUnit: boolean) => {
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
}