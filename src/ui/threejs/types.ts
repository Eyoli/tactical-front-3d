import {Object3D} from "three"
import {Position3D} from "../../domain/model/types"
import {UnitView} from "./units"

export type Target = {
    object: Object3D,
    position: Position3D,
    unitView?: UnitView
}