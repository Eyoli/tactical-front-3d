import * as THREE from "three"
import {MeshLambertMaterial, PerspectiveCamera, Renderer, Scene} from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {VoxelWorld} from "./voxel-world"
import {VoxelWorldGenerator} from "./voxel-world-generator"

export class VoxelWorldManager {
    readonly scene: Scene
    readonly camera: PerspectiveCamera
    readonly controls: OrbitControls
    readonly material: MeshLambertMaterial

    readonly world: VoxelWorld
    private readonly worldGenerator: VoxelWorldGenerator
    private readonly cellSize: number
    private cellIdToMesh = {}
    private neighborOffsets = [
        [0, 0, 0], // self
        [-1, 0, 0], // left
        [1, 0, 0], // right
        [0, -1, 0], // down
        [0, 1, 0], // up
        [0, 0, -1], // back
        [0, 0, 1], // front
    ]

    constructor(
        world: VoxelWorld,
        worldGenerator: VoxelWorldGenerator,
        material: MeshLambertMaterial,
        canvas: HTMLCanvasElement,
        cellSize: number) {
        this.world = world
        this.worldGenerator = worldGenerator
        this.material = material
        this.cellSize = cellSize

        const scene = new THREE.Scene()
        scene.background = new THREE.Color('lightblue')

        const fov = 75
        const aspect = 2  // the canvas default
        const near = 0.1
        const far = 1000
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
        camera.position.set(-cellSize * .3, cellSize * .8, -cellSize * .3)

        const controls = new OrbitControls(camera, canvas)
        controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2)
        controls.update()

        this.scene = scene
        this.camera = camera
        this.controls = controls
    }

    addLight(x: number, y: number, z: number) {
        const color = 0xFFFFFF
        const intensity = 1
        const light = new THREE.DirectionalLight(color, intensity)
        light.position.set(x, y, z)
        this.scene.add(light)
    }

    updateCellGeometry(x: number, y: number, z: number) {
        const cellX = Math.floor(x / this.cellSize)
        const cellY = Math.floor(y / this.cellSize)
        const cellZ = Math.floor(z / this.cellSize)
        const cellId = this.world.computeCellId(x, y, z)
        let mesh = this.cellIdToMesh[cellId]
        const geometry = mesh ? mesh.geometry : new THREE.BufferGeometry()

        const {positions, normals, uvs, indices} = this.worldGenerator.generateGeometryDataForCell(this.world, cellX, cellY, cellZ)
        const positionNumComponents = 3
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents))
        const normalNumComponents = 3
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents))
        const uvNumComponents = 2
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents))
        geometry.setIndex(indices)
        geometry.computeBoundingSphere()

        if (!mesh) {
            mesh = new THREE.Mesh(geometry, this.material)
            mesh.name = cellId
            this.cellIdToMesh[cellId] = mesh
            this.scene.add(mesh)
            mesh.position.set(cellX * this.cellSize, cellY * this.cellSize, cellZ * this.cellSize)
        }
    }

    updateVoxelGeometry(x: number, y: number, z: number) {
        const updatedCellIds = {}
        for (const offset of this.neighborOffsets) {
            const ox = x + offset[0]
            const oy = y + offset[1]
            const oz = z + offset[2]
            const cellId = this.world.computeCellId(ox, oy, oz)
            if (!updatedCellIds[cellId]) {
                updatedCellIds[cellId] = true
                this.updateCellGeometry(ox, oy, oz)
            }
        }
    }

    resizeRendererToDisplaySize(renderer: Renderer) {
        const canvas = renderer.domElement
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        const needResize = canvas.width !== width || canvas.height !== height
        if (needResize) {
            renderer.setSize(width, height, false)
        }
        return needResize
    }

    generateVoxels() {
        this.worldGenerator.generate(this.world)
    }


}