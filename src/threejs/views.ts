import {Position3D} from "../domain/model/types"
import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    BoxGeometry,
    Group,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    SphereGeometry,
    Vector2,
    Vector3,
    VectorKeyframeTrack
} from "three"
import {UnitView} from "./units"
import {ProjectileMotion} from "../domain/algorithm/trajectory"
import {LoopOnce} from "three/src/constants"
import {World} from "../domain/model/world"

const createTileSelectionMesh = (color: string, p: Position3D): Mesh => {
    const mesh = new Mesh(new BoxGeometry(1, 0.1, 1), new MeshStandardMaterial({
        roughness: 0,
        color,
        opacity: 0.4,
        transparent: true
    }))
    mesh.position.set(p.x, p.y - 1, p.z)
    return mesh
}

export class RangeView {
    private readonly rangeLayer = new Group()

    constructor(parent: Object3D) {
        this.rangeLayer.position.set(0.5, 1, 0.5)
        parent.add(this.rangeLayer)
    }

    draw = (unitView: UnitView, positions: Position3D[]) => {
        this.clear()
        positions.map(p => createTileSelectionMesh(unitView.player.color, p)).forEach(mesh => this.rangeLayer.add(mesh))
    }

    clear() {
        this.rangeLayer.clear()
    }
}

const showIntermediatePoints = (constraints: { x: number; y: number }[], group: Group) => {
    constraints.forEach(({x, y}) => {
        const point = new Mesh(new SphereGeometry(0.1), new MeshStandardMaterial({color: '#ff0000', roughness: 0}))
        point.position.set(x, y, 0)
        group.add(point)
    })
}

export class TrajectoryView {
    private group: Group = new Group()
    private vectors?: Vector3[]
    private launch?: AnimationAction
    private pNb = 30
    private trajectory?: ProjectileMotion
    private readonly world: World

    constructor(world: World) {
        this.world = world
    }

    draw = (source: UnitView, target: Object3D, trajectory: ProjectileMotion) => {
        const {pNb, group, clear} = this

        clear()

        const p0 = source.mesh.position
        const p1 = target.position
        const horizontalVector = new Vector2(p1.x - p0.x, p1.z - p0.z)
        const points = []
        for (let i = 0; i < pNb; i++) {
            const point = new Mesh(new SphereGeometry(0.1), new MeshStandardMaterial({roughness: 0}))
            const {x, y} = trajectory.getPoint(i / pNb)
            point.position.set(x, y, 0)
            points.push(point)
        }
        group.add(...points)
        source.mesh.add(group)
        group.rotation.y = -horizontalVector.angle()
        this.vectors = points.map(({position}) => position)
        this.trajectory = trajectory
    }

    launchProjectile = () => {
        const {pNb, trajectory, group, vectors, clear} = this

        if (!trajectory) throw new Error("No trajectory computed")

        const projectile = new Mesh(new SphereGeometry(0.1), new MeshStandardMaterial({roughness: 0}))
        group.clear()
        group.add(projectile)

        const values: number[] = [], times: number[] = []
        vectors?.forEach(({x, y, z}, i) => {
            times.push(i * trajectory.T / pNb)
            values.push(x, y, z)
        })
        const vectorKF = new VectorKeyframeTrack('.position', times, values)
        const launchAnimationClip = new AnimationClip('launch', -1, [vectorKF])
        const mixer = new AnimationMixer(projectile)
        mixer.addEventListener('finished', () => clear())
        this.launch = mixer.clipAction(launchAnimationClip)
        this.launch.setLoop(LoopOnce, 0)
        this.launch.play()
    }

    update = (time: number) => {
        this.launch?.getMixer().update(time)
    }

    clear = () => {
        console.log("Clear trajectory")
        this.group.clear()
        this.group.removeFromParent()
    }
}