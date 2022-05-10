import GUI from "lil-gui"
import {UnitView} from "./threejs/units"
import {UnitState} from "../domain/model/types"
import {GameView} from "./threejs/game-view"
import {Camera, Scene} from "three";

export class TacticalGUI {

    private readonly scene: Scene
    private unitGUI?: GUI
    private actionsGUI?: GUI

    constructor(
        parent: HTMLElement,
        private readonly camera: Camera,
        private readonly gameView: GameView,
    ) {
        gameView.on('select', (unitView, state) => {
            this.showUnitState(unitView, state)
            this.showUnitActions(state)
        })
        gameView.on('unselect', this.unselectUnit)

        this.scene = new Scene()
        this.actionsGUI = new GUI({title: "Actions"})
    }

    unselectUnit = () => {
        this.unitGUI?.destroy()
        this.actionsGUI?.destroy()
    }

    showUnitState = (unitView: UnitView, state: UnitState) => {
        const unit = unitView?.unit
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

    showUnitActions = (state: UnitState) => {
        this.actionsGUI?.destroy()
        this.actionsGUI = new GUI({title: 'Actions'})
        this.actionsGUI?.domElement.style.setProperty('top', '250px')

        state.canMove && this.actionsGUI?.add(this.gameView, 'moveMode').name('Move')
        state.canAct && this.actionsGUI?.add(this.gameView, 'attackMode').name('Attack')
        this.actionsGUI?.add(this.gameView, 'endTurn').name('End turn')
    }
}