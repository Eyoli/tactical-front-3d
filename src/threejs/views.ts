import {Position3D} from "../domain/model/types"
import {BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector2} from "three"
import {UnitView} from "./units"
import {computeProjectileMotion} from "../domain/algorithm/trajectory"

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

export class TrajectoryView {
    private trajectory: Group = new Group()

    constructor() {
    }

    draw = (source: UnitView, target: Object3D) => {
        const {trajectory, clear} = this

        clear()

        const p0 = source.mesh.position
        const p1 = target.position
        const v1 = new Vector2(p1.x - p0.x, p1.z - p0.z)
        const y1 = p1.y - p0.y
        const points = computeProjectileMotion({x1: v1.length(), y1})
            .map(({x, y}) => {
                const point = new Mesh(new SphereGeometry(0.1), new MeshStandardMaterial({roughness: 0}))
                point.position.set(x, y, 0)
                return point
            })
        trajectory.add(...points)
        source.mesh.add(trajectory)
        trajectory.rotateY(-v1.angle())
    }

    clear = () => {
        this.trajectory.clear()
        this.trajectory.removeFromParent()
    }
}