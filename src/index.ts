import {ACESFilmicToneMapping, PerspectiveCamera, PMREMGenerator, WebGLRenderer} from 'three'
import {WorldScene} from './threejs/world-scene'
import {MainScene} from "./threejs/main-scene"
import {BasicWorldMapGenerator} from "./threejs/world-map-generator"
import {stats} from "./monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {Player, World} from "./domain/model/world"
import {loadMinimalTexture} from "./threejs/textures"
import {WorldMap} from "./domain/model/world-map"

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
    const player1: Player = {id: 1, name: "P1", color: '#ff0000'}
    const player2: Player = {id: 2, name: "P2", color: '#00ff00'}
    const world = new World(worldMap)
        .addPlayers(player1, player2)
        .addUnit({id: 1, moves: 5, jump: 1}, {x: 1, z: 1}, player1)
        .addUnit({id: 2, moves: 7, jump: 2}, {x: 5, z: 5}, player2)
    const voxelWorld = new WorldScene({
        world,
        textureInfos
    })

    const mainScene = new MainScene(voxelWorld, camera, controls)
    mainScene.addWater()
    mainScene.addSky(10, renderer, pmremGenerator)

    // 0,0,0 will generate
    mainScene.generateChunk(0, 0, 0)
    // manager.generateVoxelGeometry(32, 0, 0)

    let renderRequested: boolean | undefined = false

    function render() {
        requestAnimationFrame(render)
        renderRequested = undefined
        mainScene.render(renderer)
    }

    renderer.domElement.addEventListener('mousedown', mainScene.raycast, false)

    stats()
    render()
}

main()