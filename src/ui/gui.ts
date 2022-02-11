import GUI from "lil-gui"
import {UnitView} from "./threejs/units"
import {UnitState} from "../domain/model/types"
import {GameScene} from "./threejs/game-scene"

export class TacticalGUI extends GUI {

    constructor(gameScene: GameScene, config?: {
        autoPlace?: boolean;
        container?: HTMLElement;
        width?: number;
        title?: string;
        injectStyles?: boolean;
        touchStyles?: number;
        parent?: GUI;
    }) {
        super(config)
        this.add(gameScene, 'endTurn').name('End turn')
        gameScene.on('select', (unitView, state) => this.updateSelectedUnit(gameScene, unitView, state))
        gameScene.on('unselect', (unitView, state) => this.updateSelectedUnit(gameScene, unitView, state))
    }

    updateSelectedUnit = (gameScene: GameScene, unitView: UnitView, state: UnitState) => {
        const unit = unitView?.unit
        console.log('Update unit state', unit, state)
        let unitGUI = this.folders.shift()
        if (unitGUI) {
            unitGUI.destroy()
        }
        if (unit) {
            unitGUI = this.addFolder(unit.name)
            unitGUI.add(unit, 'jump')
            unitGUI.add(unit, 'moves')
            unitGUI.add(state, 'hp', 0, unit.hp)
            unitGUI.add(state.position, 'x')
            unitGUI.add(state.position, 'y')
            unitGUI.add(state.position, 'z')
            const actions = unitGUI.addFolder("Actions")
            state.canMove && actions.add(gameScene, 'moveMode').name('Move')
            state.canAct && actions.add(gameScene, 'attackMode').name('Attack')
        }
    }
}