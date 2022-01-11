import {ACESFilmicToneMapping, PerspectiveCamera, PMREMGenerator, WebGLRenderer} from 'three'
import {GameScene} from './threejs/game-scene'
import {MainScene} from "./threejs/main-scene"
import {BasicWorldMapGenerator} from "./threejs/world-map-generator"
import {stats} from "./monitoring/stats"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {Game} from "./domain/model/game"
import {loadMinimalTexture} from "./threejs/textures"
import {WorldMap} from "./domain/model/world-map"
import {Player, Unit, UnitState} from "./domain/model/types"
import GUI from "lil-gui"
import {BOW} from "./domain/model/weapons"
import {UnitView} from "./threejs/units"

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
        8
    )
    worldGenerator.generate(worldMap)
    const player1: Player = {id: 1, name: "P1", color: '#ff0000'}
    const player2: Player = {id: 2, name: "P2", color: '#00ff00'}
    const game = new Game(worldMap)
        .addPlayers(player1, player2)
        .addUnits([new Unit({id: 1, name: "Knight", moves: 5, jump: 1, hp: 10})], {x: 1, z: 1}, player1)
        .addUnits([new Unit({id: 2, name: "Archer", moves: 7, jump: 2, hp: 10, weapon: BOW(3, 10, 1)})], {
            x: 5,
            z: 5
        }, player2)
        .start()
    const gameScene = new GameScene({
        game: game,
        textureInfos
    })

    const mainScene = new MainScene(gameScene, camera, controls)
    mainScene.addWater()
    mainScene.addSky(10, renderer, pmremGenerator)

    // 0,0,0 will generate
    mainScene.generateChunk(0, 0, 0)
    // manager.generateVoxelGeometry(32, 0, 0)

    const gameGUI = new GUI({title: "Game"})
    gameGUI.add(gameScene, 'endTurn').name('End turn')

    const drawUnitGUI = (unitView: UnitView, state: UnitState) => {
        const unit = unitView?.unit
        console.log('Update unit state', unit, state)
        let unitGUI = gameGUI.folders.shift()
        if (unitGUI) {
            unitGUI.destroy()
        }
        if (unit) {
            unitGUI = gameGUI.addFolder(unit.name)
            unitGUI.add(unit, 'jump')
            unitGUI.add(unit, 'moves')
            unitGUI.add(state, 'hp')
            unitGUI.add(state.position, 'x')
            unitGUI.add(state.position, 'y')
            unitGUI.add(state.position, 'z')
            const actions = unitGUI.addFolder("Actions")
            state.canMove && actions.add(gameScene, 'moveMode').name('Move')
            state.canAct && actions.add(gameScene, 'attackMode').name('Attack')
        }
    }
    gameScene.on('select', drawUnitGUI)
    gameScene.on('unselect', drawUnitGUI)

    function render() {
        requestAnimationFrame(render)
        mainScene.render(renderer)
    }

    renderer.domElement.addEventListener('mousedown', mainScene.raycast, false)

    stats()
    render()
}

main()