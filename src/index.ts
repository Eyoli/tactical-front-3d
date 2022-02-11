import {ACESFilmicToneMapping, PerspectiveCamera, PMREMGenerator, WebGLRenderer} from 'three'
import {GameScene} from './ui/threejs/game-scene'
import {MainScene} from "./ui/threejs/main-scene"
import {BasicWorldMapGenerator} from "./ui/threejs/world-map-generator"
import {stats} from "./ui/monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {GameBuilder} from "./domain/model/game"
import {loadImprovedTexture} from "./ui/threejs/textures"
import {WorldMap} from "./domain/model/world-map"
import {Player, Unit} from "./domain/model/types"
import {BOW} from "./domain/model/weapons"
import {TacticalGUI} from "./ui/gui"

function main() {
    const renderer = new WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5

    const pmremGenerator = new PMREMGenerator(renderer)

    const canvas = renderer.domElement
    document.body.append(canvas)

    const cellSize = 16

    // Texture
    const textureInfos = loadImprovedTexture(render)

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
        8
    )
    worldGenerator.generate(worldMap)
    const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
    const player2: Player = {id: 2, name: "P2", color: '#00ff00', mode: 'ia'}
    const game = new GameBuilder(worldMap)
        .addPlayers(player1, player2)
        .addUnit(new Unit({id: 1, type: "warrior", name: "Knight", moves: 5, jump: 1, hp: 10}), {x: 1, z: 1}, player1)
        .addUnit(new Unit({id: 2, type: "archer", name: "Archer", moves: 7, jump: 2, hp: 10, weapon: BOW(3, 10, 1)}), {
            x: 5,
            z: 5
        }, player2)
        .start()
    const gameScene = new GameScene({
        game: game,
        textureInfos
    })

    const gameGUI = new TacticalGUI(gameScene, {title: "Game"})

    const mainScene = new MainScene(gameScene, camera, controls)
    mainScene.addWater()
    mainScene.addSky(10, renderer, pmremGenerator)

    // 0,0,0 will generate
    mainScene.generateChunk(0, 0, 0)

    function render() {
        requestAnimationFrame(render)
        mainScene.render(renderer)
    }

    renderer.domElement.addEventListener('mousedown', mainScene.raycast, false)

    stats()
    render()
}

main()