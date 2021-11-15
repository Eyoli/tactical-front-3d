import * as THREE from 'three'
import {TextureInfos, VoxelWorld} from './threejs/voxel-world'
import {VoxelWorldManager} from "./threejs/voxel-world-manager"
import {BasicVoxelWorldGenerator} from "./threejs/voxel-world-generator"
import {stats} from "./monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {World} from "./model/world"

function main() {
    const renderer = new THREE.WebGLRenderer()
    const canvas = renderer.domElement
    document.body.append(canvas)
    renderer.setSize(window.innerWidth, window.innerHeight)

    const cellSize = 15

    // Texture
    const loader = new THREE.TextureLoader()
    const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/minecraft/flourish-cc-by-nc-sa.png', render)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    const textureInfos: TextureInfos = {
        material: new THREE.MeshLambertMaterial({
            map: texture,
            side: THREE.DoubleSide,
            alphaTest: 0.1,
            transparent: true,
        }),
        tileSize: 16,
        tileTextureWidth: 256,
        tileTextureHeight: 64
    }

    // Camera
    const fov = 75
    const aspect = 2  // the canvas default
    const near = 0.1
    const far = 1000
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(-cellSize * .3, cellSize * .8, -cellSize * .3)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2)
    controls.update()

    const world = new World(cellSize)
    const worldGenerator = new BasicVoxelWorldGenerator(
        cellSize,
        cellSize,
        15,
    )
    worldGenerator.generate(world)
    worldGenerator.generate(world, cellSize, 0, 0)
    const voxelWorld = new VoxelWorld({
        world,
        textureInfos
    })

    const manager = new VoxelWorldManager(voxelWorld, renderer, camera, controls)
    manager.addLight(-1, 2, 4)
    manager.addLight(1, -1, -2)
    manager.addWater()

    // 0,0,0 will generate
    manager.generateChunk(0, 0, 0)
    // manager.generateVoxelGeometry(32, 0, 0)

    let renderRequested: boolean | undefined = false

    function render() {
        renderRequested = undefined
        manager.render(renderer)
        requestAnimationFrame(render)
    }

    stats()
    render()
}

main()