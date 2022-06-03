import {Range} from "./weapons";
import {ProjectileMotion} from "../algorithm/trajectory";
import {TrajectoryType, Unit, UnitState} from "./types";

export interface Action {
    modify(target: UnitState): UnitState

    get source(): Unit

    get range(): Range

    get trajectory(): TrajectoryType | undefined
}

export class AttackAction implements Action {
    readonly source: Unit

    constructor(source: Unit) {
        this.source = source
    }

    get range() {
        return this.source.weapon.range
    }

    get trajectory() {
        return this.source.weapon.trajectory
    }

    modify = (target: UnitState): UnitState => target.modify(-this.source.weapon.power)
}

export type ActionResult = {
    newStates: Map<Unit, UnitState>
    trajectory?: ProjectileMotion
}