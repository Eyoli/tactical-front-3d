import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    BoxGeometry,
    Mesh,
    MeshStandardMaterial,
    Quaternion,
    QuaternionKeyframeTrack,
    Vector3,
    VectorKeyframeTrack
} from "three"
import {Position3D, Unit} from "../model/world"
import {LoopOnce} from "three/src/constants"

export class UnitMesh {
    readonly mesh: Mesh
    readonly unit: Unit
    readonly idle: AnimationAction
    move?: AnimationAction

    constructor(unit: Unit, mesh: Mesh, idleAnimationClip: AnimationClip) {
        this.mesh = mesh
        this.unit = unit
        const mixer = new AnimationMixer(mesh)
        this.idle = mixer.clipAction(idleAnimationClip)
    }

    computeMovingAnimation(path: Position3D[]) {
        const object = this
        const values: number[] = [], times: number[] = []
        path.forEach(({x, y, z}, i) => {
            if (i > 0 && y - path[i - 1].y > 0) {
                values.push(path[i - 1].x + 0.5, y + 0.5, path[i - 1].z + 0.5)
                times.push(values.length / 3)
            } else if (i > 0 && y - path[i - 1].y < 0) {
                values.push(x + 0.5, path[i - 1].y + 0.5, z + 0.5)
                times.push(values.length / 3)
            }
            values.push(x + 0.5, y + 0.5, z + 0.5)
            times.push(values.length / 3)
        })
        const vectorKF = new VectorKeyframeTrack('.position', times, values)
        const moveAnimationClip = new AnimationClip('move', -1, [vectorKF])
        const mixer = new AnimationMixer(object.mesh)

        const to = values.slice(values.length - 3)
        object.mesh.position.set(to[0], to[1], to[2])

        object.move = mixer.clipAction(moveAnimationClip)
        object.move.setLoop(LoopOnce, 0)
        mixer.addEventListener('finished', () => {
            object.move = undefined
        })
    }
}

export const initUnit = (unit: Unit): UnitMesh => {
    const mesh = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({roughness: 0}))

    // animations
    const xAxis = new Vector3(1, 0, 0)
    const qInitial = new Quaternion().setFromAxisAngle(xAxis, 0)
    const qFinal = new Quaternion().setFromAxisAngle(xAxis, Math.PI)
    const quaternionKF = new QuaternionKeyframeTrack('.quaternion', [0, 1, 2], [qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w, qInitial.x, qInitial.y, qInitial.z, qInitial.w])
    const idleAnimationClip = new AnimationClip('idle', -1, [quaternionKF])

    return new UnitMesh(unit, mesh, idleAnimationClip)
}