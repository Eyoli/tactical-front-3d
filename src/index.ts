import {ACESFilmicToneMapping, PerspectiveCamera, PMREMGenerator, WebGLRenderer} from 'three'
import {VoxelWorld} from './threejs/voxel-world'
import {VoxelWorldManager} from "./threejs/voxel-world-manager"
import {BasicWorldMapGenerator} from "./threejs/world-map-generator"
import {stats} from "./monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {World, WorldMap} from "./domain/model/world"
import {loadMinimalTexture} from "./threejs/textures"

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
    const textureInfos = loadMinimalTexture(render)

    // Camera
    const fov = 75
    const aspect = 2  // the canvas default
    const near = 1
    const far = 20000
    const camera = new PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(-cellSize * .3, cellSize * .8, -cellSize * .3)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2)
    controls.update()

    const worldMap = new WorldMap(cellSize)
    const worldGenerator = new BasicWorldMapGenerator(
        cellSize,
        cellSize,
        8,
    )
    worldGenerator.generate(worldMap)
    const world = new World(worldMap)
        .addUnit({id: 1, moves: 5, jump: 1}, {x: 1, z: 1})
    const voxelWorld = new VoxelWorld({
        world,
        textureInfos
    })

    const manager = new VoxelWorldManager(voxelWorld, camera, controls)
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

    renderer.domElement.addEventListener('mousedown', manager.raycast, false)

    stats()
    render()
}

main()