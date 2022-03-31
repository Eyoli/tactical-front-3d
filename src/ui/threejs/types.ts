import {Position3D} from "../../domain/model/types"
import {UnitView} from "./units"

export type Target = {
    position: Position3D,
    unitView?: UnitView
}