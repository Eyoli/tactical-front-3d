import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    BoxGeometry,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    Quaternion,
    QuaternionKeyframeTrack,
    Vector3,
    VectorKeyframeTrack
} from "three"
import {Player, Position3D, Unit} from "../domain/model/types"
import {LoopOnce} from "three/src/constants"

export class UnitView {
    readonly mesh: Object3D
    readonly unit: Unit
    readonly player: Player
    readonly idle: AnimationAction
    readonly childrenIds
    move?: AnimationAction

    constructor(unit: Unit, player: Player, mesh: Object3D, idleAnimationClip: AnimationClip) {
        this.mesh = mesh
        this.unit = unit
        this.player = player
        const mixer = new AnimationMixer(mesh)
        this.idle = mixer.clipAction(idleAnimationClip)
        this.childrenIds = this.computeChildrenIds(mesh)
    }

    startMovingToward = (path: Position3D[], speed: number = 1) => {
        const object = this
        const values: number[] = [], times: number[] = []
        path.forEach(({x, y, z}, i) => {
            if (i > 0 && y - path[i - 1].y > 0) {
                values.push(path[i - 1].x, y, path[i - 1].z)
                times.push(times.length / speed)
            } else if (i > 0 && y - path[i - 1].y < 0) {
                values.push(x, path[i - 1].y, z)
                times.push(times.length / speed)
            }
            values.push(x, y, z)
            times.push(times.length / speed)
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

        object.move?.play()
    }

    get isMoving() {
        return !this.move
    }

    private computeChildrenIds = (mesh: Object3D) => {
        let listToExplore: Object3D[] = []
        let listToFill: string[] = []
        let element: Object3D | undefined = mesh
        while (element) {
            listToFill.push(element.uuid)
            listToExplore.push(...element.children)
            element = listToExplore.shift()
        }
        return listToFill
    }
}

export const initUnit = (unit: Unit, p: Position3D, player: Player): UnitView => {
    const mesh = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({roughness: 0, color: player.color}))
    const parent = new Mesh()
    parent.position.set(p.x, p.y, p.z)
    mesh.position.set(0, 0.5, 0)
    parent.add(mesh)

    // animations
    const xAxis = new Vector3(1, 0, 0)
    const qInitial = new Quaternion().setFromAxisAngle(xAxis, 0)
    const qFinal = new Quaternion().setFromAxisAngle(xAxis, Math.PI)
    const quaternionKF = new QuaternionKeyframeTrack('.children[0].quaternion', [0, 1, 2], [qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w, qInitial.x, qInitial.y, qInitial.z, qInitial.w])
    const idleAnimationClip = new AnimationClip('idle', -1, [quaternionKF])

    return new UnitView(unit, player, parent, idleAnimationClip)
}