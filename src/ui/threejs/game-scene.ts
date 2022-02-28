import {BufferGeometry, Group, Intersection, Material, Mesh} from "three"
import {Action, AttackAction, Position2D, Unit} from "../../domain/model/types"
import {initUnit, UnitView} from "./units"
import {TextureInfos, updateChunkGeometry} from "./textures"
import {Game} from "../../domain/model/game"
import {RangeView, TrajectoryView} from "./views"
import {GameService} from "../../domain/service/game-service"
import {GamePort, IAPort} from "../../domain/ports"
import {IAService} from "../../domain/service/ia-service"
import {ActionDetail} from "../../domain/model/ia"

type GameSceneProps = {
    game: Game,
    textureInfos: TextureInfos
}
type SelectionMode = 'move' | 'attack' | 'preview'
type GameEvent = 'select' | 'unselect' | 'preview'
type GameEventCallback = (...args: any) => void

const neighborOffsets = [
    [0, 0, 0], // self
    [-1, 0, 0], // left
    [1, 0, 0], // right
    [0, -1, 0], // down
    [0, 1, 0], // up
    [0, 0, -1], // back
    [0, 0, 1], // front
]

const gamePort: GamePort = new GameService()
const iaPort: IAPort = new IAService()

class IAManager {
    constructor(private readonly gameScene: GameScene) {
    }

    handleTurn = (unitView: UnitView) => {
        const {game} = this.gameScene
        const turn = iaPort.computeBestTurnActions(game, unitView.unit)
        this.handleAction(unitView, turn.actions)
    }

    private handleAction = (unitView: UnitView, actions: IterableIterator<ActionDetail>) => {
        const {gameScene, handleAction} = this
        const itResult = actions.next()
        if (!itResult.done) {
            const action = itResult.value
            if (action.type === "move") {
                // We execute the move
                gameScene.handleUnitMove(action.position!, () => this.handleAction(unitView, actions))
            } else if (action.type === "attack") {
                // We execute the attack
                const mesh = gameScene.getUnitMeshFromUnit(action.target!)
                gameScene.handleAttackActionSelection(unitView)
                setTimeout(() => {
                    gameScene.executeUnitAction(mesh, () => this.handleAction(unitView, actions))
                }, 1000)
            } else {
                // We can't do anything with this kind of action, so we proceed to the next one
                handleAction(unitView, actions)
            }
        } else {
            gameScene.endTurn()
        }
    }
}

export class GameScene {
    readonly game: Game
    private readonly textureInfos: TextureInfos
    private readonly chunkIdToMesh: Map<string, Mesh<BufferGeometry, Material>> = new Map()
    private readonly unitsToMesh: Map<Unit, UnitView> = new Map<Unit, UnitView>()
    private readonly rangeView: RangeView
    readonly parent: Group
    private readonly unitLayer: Group
    private trajectoryView: TrajectoryView
    private _callbacks: Map<GameEvent, GameEventCallback> = new Map()
    private readonly iaManager = new IAManager(this)

    private _selectedUnit?: UnitView
    private _selectedAction?: Action
    private _mode?: SelectionMode
    private _frozen = false

    constructor({game, textureInfos}: GameSceneProps) {
        this.game = game
        this.textureInfos = textureInfos

        this.parent = new Group()

        this.unitLayer = new Group()
        this.unitLayer.position.set(0.5, 0, 0.5)
        this.parent.add(this.unitLayer)

        this.rangeView = new RangeView(this.parent)
        this.trajectoryView = new TrajectoryView()
    }

    getChunkMesh = (x: number, y: number, z: number): Mesh<BufferGeometry, Material> | undefined => {
        const cellId = this.game.world.computeChunkId({x, y, z})
        return this.chunkIdToMesh.get(cellId)
    }

    createCellMesh = (x: number, y: number, z: number): Mesh<BufferGeometry, Material> => {
        const cellId = this.game.world.computeChunkId({x, y, z})
        const mesh = new Mesh<BufferGeometry, Material>(new BufferGeometry(), this.textureInfos.material)
        mesh.name = cellId
        this.chunkIdToMesh.set(cellId, mesh)
        return mesh
    }

    generateChunk(x: number, y: number, z: number) {
        const {chunkSize, getVoxel} = this.game.world
        const {textureInfos} = this

        const updatedCellIds = new Map<string, boolean>()
        for (const offset of neighborOffsets) {
            const ox = x + offset[0]
            const oy = y + offset[1]
            const oz = z + offset[2]
            const cellId = this.game.world.computeChunkId({x: ox, y: oy, z: oz})
            if (!updatedCellIds.get(cellId)) {
                updatedCellIds.set(cellId, true)
                let chunkMesh = this.getChunkMesh(ox, oy, oz)
                if (!chunkMesh) {
                    chunkMesh = this.createCellMesh(ox, oy, oz)
                    this.parent.add(chunkMesh)
                    chunkMesh.position.set(x, y, z)
                }
                updateChunkGeometry(ox, oy, oz, chunkSize, chunkMesh, textureInfos, getVoxel)
            }
        }
    }

    generateUnits = () => {
        const {unitLayer, game, unitsToMesh, select, getUnitMeshFromUnit} = this
        game.playersUnits.forEach((units, player) => {
            units.forEach(unit => {
                const p = gamePort.getPosition(game, unit)
                if (p) {
                    const unitMesh = initUnit(unit, p, player)
                    unitMesh.idle.play()
                    unitLayer.add(unitMesh.mesh)
                    unitsToMesh.set(unit, unitMesh)
                }
            })
        })

        const activeUnit = getUnitMeshFromUnit(game.getActiveUnit())
        activeUnit && select(activeUnit)
    }

    update = (time: number) => {
        Array.from(this.unitsToMesh.values()).forEach(unitView => unitView.update(time))
        this.trajectoryView.update(time)
    }

    getUnitMeshFromUnit = (unit: Unit) => {
        const mesh = this.unitsToMesh.get(unit)
        if (!mesh) throw new Error(`Unit ${unit} has no mesh`)
        return mesh
    }

    getUnitMesh = (uuid: string): UnitView | undefined => Array.from(this.unitsToMesh.values()).find((unitMesh) => unitMesh.childrenIds.indexOf(uuid) > 0)

    handleUnitMove = (p: Position2D, onAnimationFinished: () => void) => {
        const {game, _callbacks, rangeView, _selectedUnit, select} = this

        if (!_selectedUnit) {
            console.log('No unit has been selected')
            return
        }

        // Verify that a path exists between the locations
        const path = gamePort.moveUnit(game, _selectedUnit.unit, p)
        if (!path) {
            console.log(`Impossible to move unit (id=${_selectedUnit.unit.id}) to`, p, 'no path found')
            return
        }

        rangeView.clear()

        console.log(`Moving unit (id=${_selectedUnit.unit.id}) to`, p)

        const mixer = _selectedUnit.startMovingToward(path, 5)
        mixer.addEventListener('finished', onAnimationFinished)

        const state = game.getState(_selectedUnit.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(_selectedUnit, state)
        }

        select(_selectedUnit)
    }

    private previewUnitAction = (target: UnitView) => {
        const {game, _callbacks, rangeView, _selectedUnit, _selectedAction, trajectoryView} = this
        const p = gamePort.getPosition(game, target.unit)

        if (!_selectedUnit) throw new Error("No selected unit")
        if (!_selectedAction) throw new Error("No selected action")

        const actionResult = gamePort.previewAction(game, _selectedAction, p)

        console.log("Action previewed", _selectedAction, p)

        const state = game.getState(_selectedUnit.unit)
        const callback = _callbacks.get('preview')
        if (callback && state) {
            callback(_selectedUnit, Array.from(actionResult.newStates.entries()).map(({0: unit, 1: newState}) => ({
                state: game.getState(unit),
                newState,
                unit
            })))
        }

        actionResult.trajectory && trajectoryView.draw(_selectedUnit, target.mesh, actionResult.trajectory)
        rangeView.clear()
        rangeView.draw(_selectedUnit, [state.position])
        rangeView.draw(target, [game.getState(target.unit).position])

        this._mode = "preview"
    }

    executeUnitAction = (target: UnitView, onAnimationFinished: () => void) => {
        const {game, _callbacks, rangeView, trajectoryView, _selectedUnit, _selectedAction, select} = this
        const p = gamePort.getPosition(game, target.unit)

        if (!_selectedUnit) throw new Error("No selected unit")
        if (!_selectedAction) throw new Error("No selected action")

        gamePort.executeAction(game, _selectedAction, p)

        console.log("Action executed", _selectedAction, p)

        const state = game.getState(_selectedUnit.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(_selectedUnit, state)
        }

        rangeView.clear()
        const mixer = _selectedUnit.startAttacking(target, trajectoryView, 1)
        mixer.addEventListener('finished', () => {
            trajectoryView.clear()
            onAnimationFinished()
        })

        select(_selectedUnit)
    }

    private handleMoveActionSelection = (unitView: UnitView) => {
        const {game, rangeView, _callbacks} = this

        rangeView.draw(unitView, gamePort.getReachablePositions(game, unitView.unit))

        const state = game.getState(unitView.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            console.log('Selecting unit', unitView.unit, state)
            callback(unitView, state)
        }

        this._selectedUnit = unitView
    }

    handleAttackActionSelection = (unitView: UnitView) => {
        const {game, rangeView, _callbacks} = this

        console.log('Displaying attack range', unitView)

        const action = new AttackAction(unitView.unit)
        rangeView.draw(unitView, gamePort.getReachablePositionsForAction(game, action))

        const state = game.getState(unitView.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(unitView, state)
        }

        this._selectedUnit = unitView
        this._selectedAction = action
    }

    on = (event: GameEvent, callback: GameEventCallback) => this._callbacks.set(event, callback)

    attackMode = () => {
        this._mode = "attack"
        if (this._selectedUnit) {
            this.handleAttackActionSelection(this._selectedUnit)
        }
    }

    moveMode = () => {
        this._mode = "move"
        if (this._selectedUnit) {
            this.handleMoveActionSelection(this._selectedUnit)
        }
    }

    startTurn = () => {
        this._frozen = false
        const {game, iaManager, select, getUnitMeshFromUnit} = this
        const activePlayer = game.getActivePlayer()
        const activeMesh = getUnitMeshFromUnit(game.getActiveUnit())
        select(activeMesh)
        if (activePlayer.mode === 'ia') {
            this._frozen = true
            activeMesh && iaManager.handleTurn(activeMesh)
        }
    }

    endTurn = () => {
        const {game, startTurn} = this
        game.nextTurn()
        startTurn()
    }

    private select = (unitView: UnitView) => {
        const callback = this._callbacks.get('select')
        const state = this.game.getState(unitView.unit)
        if (callback && state) {
            callback(unitView, state)
        }
        this.rangeView.draw(unitView, [state.position])
        this._mode = undefined
        this._selectedAction = undefined
        this._selectedUnit = unitView
    }

    private unselect = () => {
        this._selectedUnit = undefined
        this._selectedAction = undefined
        this.trajectoryView.clear()
        this.rangeView.clear()
        const callback = this._callbacks.get('unselect')
        callback && callback()
    }

    handleLeftClick = (intersects: Intersection[]) => {
        const {
            game,
            _mode,
            _selectedUnit,
            trajectoryView,
            _frozen,
            select,
            unselect,
            previewUnitAction,
            executeUnitAction,
            getUnitMesh,
            handleUnitMove
        } = this
        console.log("Frozen:", _frozen)
        const unitView = intersects.map(i => getUnitMesh(i.object.uuid)).find(i => i != undefined)
        if (unitView) {
            if (_selectedUnit) {
                if (_selectedUnit === unitView) {
                    unselect()
                } else if (_mode === "attack") {
                    previewUnitAction(unitView)
                } else if (_mode === "preview") {
                    this._frozen = true
                    executeUnitAction(unitView, () => {
                        trajectoryView.clear()
                        this._frozen = false
                    })
                }
            } else {
                select(unitView)
            }
        } else if (_mode === "move" && intersects.length > 0 && !_frozen) {
            trajectoryView.clear()
            const p = game.world.getClosestPosition2D({x: intersects[0].point.x, z: intersects[0].point.z})
            this._frozen = true
            handleUnitMove(p, () => this._frozen = false)
        }
    }
}

