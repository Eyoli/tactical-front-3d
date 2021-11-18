import * as THREE from 'three'
import {ACESFilmicToneMapping, PMREMGenerator, WebGLRenderer} from 'three'
import {TextureInfos, VoxelWorld} from './threejs/voxel-world'
import {VoxelWorldManager} from "./threejs/voxel-world-manager"
import {BasicVoxelWorldGenerator} from "./threejs/voxel-world-generator"
import {stats} from "./monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {World, WorldMap} from "./model/world"

function main() {
    const renderer = new WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5

    const pmremGenerator = new PMREMGenerator(renderer)

    const canvas = renderer.domElement
    document.body.append(canvas)

    const cellSize = 15

    // Texture
    const loader = new THREE.TextureLoader()
    const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/minecraft/flourish-cc-by-nc-sa.png', render)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    const textureInfos: TextureInfos = {
        material: new THREE.MeshStandardMaterial({
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
    const near = 1
    const far = 20000
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(-cellSize * .3, cellSize * .8, -cellSize * .3)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2)
    controls.update()

    const worldMap = new WorldMap(cellSize)
    const worldGenerator = new BasicVoxelWorldGenerator(
        cellSize,
        cellSize,
        8,
    )
    worldGenerator.generate(worldMap)
    const world = new World(worldMap)
    const voxelWorld = new VoxelWorld({
        world,
        textureInfos
    })

    const manager = new VoxelWorldManager(voxelWorld, camera, controls)
    // manager.addLight(-1, 2, 4)
    // manager.addLight(1, -1, -2)
    manager.addWater()
    manager.addSky(renderer, pmremGenerator)

    // 0,0,0 will generate
    manager.generateChunk(0, 0, 0)
    // manager.generateVoxelGeometry(32, 0, 0)

    let renderRequested: boolean | undefined = false

    function render() {
        requestAnimationFrame(render)
        renderRequested = undefined
        manager.render(renderer)
    }

    stats()
    render()
}

main()