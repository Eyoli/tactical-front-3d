import {ACESFilmicToneMapping, Clock, PerspectiveCamera, Raycaster, Scene, WebGLRenderer} from 'three'
import {GameView} from './ui/threejs/game-view'
import {MainScene} from "./ui/threejs/main-scene"
import {BasicWorldMapGenerator} from "./ui/threejs/world-map-generator"
import {stats} from "./ui/threejs/monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {GameBuilder} from "./domain/models/game"
import {loadImprovedTexture} from "./ui/threejs/textures"
import {Player, Unit} from "./domain/models/types"
import {BOW} from "./domain/models/weapons"
import {TacticalGUI} from "./ui/threejs/gui"
import {SceneContext} from "./ui/threejs/context"
import {GameManager} from "./ui/models/game-manager";
import {PositionSelectionEvent, UnitSelectionEvent} from "./ui/models/types";
import {GameState} from "./ui/models/game-state";
import {IAManager} from "./ui/models/ia";

function main() {
    const cellSize = 16
    const clock = new Clock()

    const context = initSceneContext(cellSize)

    // Texture
    const textureInfos = loadImprovedTexture(render)

    const game = initGame(cellSize)

    const scene = new Scene()

    const gameView = new GameView(scene, context, textureInfos)
    gameView.generateChunk(game.world)
    gameView.generateUnits(game)

    const mainScene = new MainScene(scene, context)
    mainScene.addWater(game.world.waterLevel)
    mainScene.addSky()

    const gameManager = new GameManager(game, gameView)
    const iaManager = new IAManager(gameManager, 200)
    const gameGUI = new TacticalGUI(context.camera, gameManager)

    gameManager.register("stateChanged", (gameState: GameState) => updateGUI(gameGUI, gameState))
    gameManager.handleEvent(new UnitSelectionEvent(game.getActiveUnit()))

    const raycast = (e: MouseEvent) => {

        if (e.button !== 0) {
            return
        }

        const {camera, raycaster} = context
        // 1. sets the mouse position with a coordinate system where the center
        //   of the screen is the origin
        const mouse = {
            x: (e.clientX / window.innerWidth) * 2 - 1,
            y: -(e.clientY / window.innerHeight) * 2 + 1
        }

        // 2. set the picking ray from the camera position and mouse coordinates
        raycaster.setFromCamera(mouse, camera)

        // 3. compute intersections (no 2nd parameter true anymore)
        const intersects = raycaster.intersectObjects(scene.children, true)
        if (intersects.length > 0) {
            /*
                An intersection has the following properties :
                    - object : intersected object (THREE.Mesh)
                    - distance : distance from camera to intersection (number)
                    - face : intersected face (THREE.Face3)
                    - faceIndex : intersected face index (number)
                    - point : intersection point (THREE.Vector3)
                    - uv : intersection point in the object's UV coordinates (THREE.Vector2)
            */
            if (!iaManager.isActive()) {
                const target = gameView.getTarget(game, intersects)
                target?.position && gameManager.handleEvent(new PositionSelectionEvent(target.position))
                target?.unit && gameManager.handleEvent(new UnitSelectionEvent(target.unit))
            }
        }
    }

    context.renderer.domElement.addEventListener('mousedown', raycast, false)

    function render() {
        requestAnimationFrame(render)
        const delta = clock.getDelta()
        mainScene.update(delta)
        gameView.update(delta)

        context.renderer.render(scene, context.camera)
    }

    stats()
    render()
}

const updateGUI = (gui: TacticalGUI, gameState: GameState) => {
    gui.update(gameState)
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
}

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