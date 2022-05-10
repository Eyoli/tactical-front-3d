import {ACESFilmicToneMapping, Clock, PerspectiveCamera, Raycaster, Scene, WebGLRenderer} from 'three'
import {GameView} from './ui/threejs/game-view'
import {MainScene} from "./ui/threejs/main-scene"
import {BasicWorldMapGenerator} from "./ui/threejs/world-map-generator"
import {stats} from "./ui/monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {GameBuilder} from "./domain/model/game"
import {loadImprovedTexture} from "./ui/threejs/textures"
import {Player, Unit} from "./domain/model/types"
import {BOW} from "./domain/model/weapons"
import {TacticalGUI} from "./ui/gui"
import {SceneContext} from "./ui/threejs/context"

function main() {
    const cellSize = 16
    const clock = new Clock()

    const context = initSceneContext(cellSize)

    // Texture
    const textureInfos = loadImprovedTexture(render)

    const game = initGame(cellSize)

    const scene = new Scene()

    const gameView = new GameView(game, scene, context, textureInfos, 200)
    gameView.generateChunk()
    gameView.generateUnits()

    const mainScene = new MainScene(scene, context)
    mainScene.addWater(gameView.game.world.waterLevel)
    mainScene.addSky()

    const gameGUI = new TacticalGUI(context.canvas, context.camera, gameView)

    function render() {
        requestAnimationFrame(render)
        const delta = clock.getDelta()
        mainScene.update(delta)
        gameView.update(delta)

        context.renderer.render(scene, context.camera)
    }

    stats()
    render()

    gameView.startTurn()
}

const initSceneContext = (cellSize: number) => {
    const renderer = new WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5

    const canvas = renderer.domElement
    document.body.append(canvas)

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

    return new SceneContext(
        renderer,
        camera,
        controls,
        new Raycaster()
    )
}

const initGame = (cellSize: number) => {
    const worldGenerator = new BasicWorldMapGenerator(
        cellSize,
        cellSize,
        8
    )
    const worldMap = worldGenerator.generate()
    const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
    const player2: Player = {id: 2, name: "P2", color: '#00ff00', mode: 'ia'}
    let id = 0
    return new GameBuilder(worldMap)
        .addPlayers(player1, player2)
        .addUnit(new Unit({
            id: id++,
            type: "warrior",
            name: "Knight " + id,
            moves: 5,
            jump: 1,
            hp: 10
        }), worldMap.getRandomPosition(0, 0, cellSize - 1, cellSize - 1), player1)
        .addUnit(new Unit({
            id: id++,
            type: "warrior",
            name: "Knight " + id,
            moves: 8,
            jump: 1,
            hp: 10
        }), worldMap.getRandomPosition(0, 0, cellSize - 1, cellSize - 1), player1)
        .addUnit(new Unit({
            id: id++,
            type: "warrior",
            name: "Knight " + id,
            moves: 8,
            jump: 1,
            hp: 10
        }), worldMap.getRandomPosition(0, 0, cellSize - 1, cellSize - 1), player1)
        .addUnit(new Unit({
            id: id++,
            type: "archer",
            name: "Knight " + id,
            moves: 8,
            jump: 1,
            hp: 10,
            weapon: BOW(3, 10, 1)
        }), worldMap.getRandomPosition(0, 0, cellSize - 1, cellSize - 1), player1)
        .addUnit(new Unit({
            id: id++,
            type: "archer",
            name: "Archer " + id,
            moves: 7,
            jump: 2,
            hp: 10,
            weapon: BOW(3, 10, 1)
        }), worldMap.getRandomPosition(0, 0, cellSize - 1, cellSize - 1), player2)
        .addUnit(new Unit({
            id: id++,
            type: "archer",
            name: "Archer " + id,
            moves: 7,
            jump: 2,
            hp: 10,
            weapon: BOW(3, 10, 1)
        }), worldMap.getRandomPosition(0, 0, cellSize - 1, cellSize - 1), player2)
        .start();
};

main()

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}