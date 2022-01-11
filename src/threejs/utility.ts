import {Camera, Object3D, Vector2, Vector3} from "three"
import {Position3D} from "../domain/model/types"

export const toScreenPosition = (object: Object3D, camera: Camera, canvas: HTMLCanvasElement): Vector2 => {
    const vector = new Vector3()

    // map to normalized device coordinate (NDC) space
    object.updateMatrixWorld()
    vector.setFromMatrixPosition(object.matrixWorld)
    vector.project(camera)

    // map to 2D screen space
    return new Vector2(
        Math.round((vector.x + 1) * canvas.width / 2),
        Math.round((-vector.y + 1) * canvas.height / 2)
    )
}

export const toVector3 = ({x, y, z}: Position3D) => new Vector3(x, y, z)