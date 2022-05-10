import {BufferGeometry, Group, Intersection, Material, Mesh, Scene} from "three"
import {Action, AttackAction, Position2D, Unit} from "../../domain/model/types"
import {initUnit, UnitView} from "./units"
import {TextureInfos, updateChunkGeometry} from "./textures"
import {Game} from "../../domain/model/game"
import {RangeView, TrajectoryView} from "./views"
import {IAManager} from "./ia"
import {Target} from "./types"
import {toScreenPosition, toVector3} from "./utility";
import {SceneContext} from "./context";

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

export class GameView {
    private readonly worldMesh: Mesh<BufferGeometry, Material>
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

    constructor(
        readonly game: Game,
        scene: Scene,
        private readonly context: SceneContext,
        private readonly textureInfos: TextureInfos,
        readonly delay: number = 1000
    ) {
        this.parent = new Group()
        scene.add((this.parent))

        this.unitLayer = new Group()
        this.unitLayer.position.set(0.5, 0, 0.5)
        this.parent.add(this.unitLayer)

        this.rangeView = new RangeView(this.parent)
        this.trajectoryView = new TrajectoryView()

        this.worldMesh = new Mesh<BufferGeometry, Material>(new BufferGeometry(), this.textureInfos.material)
        this.parent.add(this.worldMesh)
        this.worldMesh.position.set(0, 0, 0)

        context.renderer.domElement.addEventListener('mousedown', this.raycast, false)
    }

    generateChunk() {
        const {getVoxel} = this.game.world
        const {textureInfos} = this

        const updatedCellIds = new Map<string, boolean>()
        for (const offset of neighborOffsets) {
            const ox = offset[0]
            const oy = offset[1]
            const oz = offset[2]
            const cellId = "1"
            if (!updatedCellIds.get(cellId)) {
                updatedCellIds.set(cellId, true)
                updateChunkGeometry(ox, oy, oz, this.game.world.chunkSize, this.worldMesh, textureInfos, getVoxel)
            }
        }
    }

    generateUnits = () => {
        const {unitLayer, game, unitsToMesh, select, getUnitViewFromUnit} = this
        game.playersUnits.forEach((units, player) => {
            units.forEach(unit => {
                const p = game.getPosition(unit)
                if (p) {
                    const unitMesh = initUnit(unit, p, player)
                    unitMesh.idle.play()
                    unitLayer.add(unitMesh.mesh)
                    unitsToMesh.set(unit, unitMesh)
                }
            })
        })

        const activeUnit = getUnitViewFromUnit(game.getActiveUnit())
        activeUnit && select(activeUnit)
    }

    update = (time: number) => {
        Array.from(this.unitsToMesh.values()).forEach(unitView => unitView.update(time))
        this.trajectoryView.update(time)
    }

    getUnitViewFromUnit = (unit: Unit) => {
        const mesh = this.unitsToMesh.get(unit)
        if (!mesh) throw new Error(`Unit ${unit} has no mesh`)
        return mesh
    }

    getTarget = (intersects: Intersection[]): Target | undefined => {
        const {game} = this
        const unitView = intersects
            .map(i => Array.from(this.unitsToMesh.values())
                .find((unitMesh) => unitMesh.childrenIds.indexOf(i.object.uuid) > 0))
            .find(i => i != undefined)
        if (unitView) {
            return {
                position: game.getPosition(unitView.unit),
                unitView
            }
        } else if (intersects.length > 0) {
            return {
                position: game.world.getClosestPositionInWorld({x: intersects[0].point.x, z: intersects[0].point.z})
            }
        }
        return undefined
    }

    moveSelectedUnitTo = (p: Position2D): Promise<void> => {
        const {game, _callbacks, rangeView, _selectedUnit, select} = this


        if (!_selectedUnit) {
            return Promise.reject('No unit has been selected')
        }

        // Verify that a path exists between the locations
        const path = game.moveUnit(_selectedUnit.unit, p)
        if (!path) {
            return Promise.reject(`Impossible to move unit (id=${_selectedUnit.unit.id}) to ${p} : no path found`)
        }

        console.log(`Moving unit (id=${_selectedUnit.unit.id}) to`, p)

        const state = game.getState(_selectedUnit.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(_selectedUnit, state)
        }

        rangeView.clear()

        select(_selectedUnit)

        return _selectedUnit.startMovingToward(path, 5)
    }

    previewSelectedAction = (target: Target) => {
        const {game, _callbacks, rangeView, _selectedUnit, _selectedAction, trajectoryView} = this

        if (!_selectedUnit) throw new Error("No selected unit")
        if (!_selectedAction) throw new Error("No selected action")

        const actionResult = game.previewAction(_selectedAction, target.position)

        console.log("Action previewed", _selectedAction, target.position)

        const state = game.getState(_selectedUnit.unit)
        const callback = _callbacks.get('preview')
        if (callback && state) {
            callback(_selectedUnit, Array.from(actionResult.newStates.entries()).map(({0: unit, 1: newState}) => ({
                state: game.getState(unit),
                newState,
                unit
            })))
        }

        actionResult.trajectory && trajectoryView.draw(_selectedUnit, toVector3(target.position), actionResult.trajectory)
        rangeView.clear()
        rangeView.draw(_selectedUnit.player.color, [state.position])
        rangeView.draw('#000000', [target.position])

        this._mode = "preview"
    }

    executeSelectedAction = (target: Target): Promise<void> => {
        const {
            game,
            _callbacks,
            rangeView,
            trajectoryView,
            _selectedUnit,
            _selectedAction,
            select,
            getUnitViewFromUnit
        } = this

        if (!_selectedUnit) return Promise.reject("No selected unit")
        if (!_selectedAction) return Promise.reject("No selected action")

        const actionResult = game.executeAction(_selectedAction, target.position)
        actionResult.newStates.forEach((newState, unit) => {
            if (newState.dead) {
                const unitView = getUnitViewFromUnit(unit)
                console.log("Unit is dead", unit)
                unitView.die()
            }
        })

        console.log("Action executed", _selectedAction, target.position)

        const state = game.getState(_selectedUnit.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(_selectedUnit, state)
        }

        rangeView.clear()
        select(_selectedUnit)

        return _selectedUnit.startAttacking(toVector3(target.position), trajectoryView, 1)
    }

    private selectMoveAction = (unitView: UnitView) => {
        const {game, rangeView, _callbacks} = this

        rangeView.draw(unitView.player.color, game.getReachablePositions(unitView.unit))

        const state = game.getState(unitView.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            const screenPosition = toScreenPosition(unitView.mesh, this.context.camera, this.context.canvas)
            console.log('Selecting unit', unitView.unit, state, screenPosition)
            callback(unitView, state)
        }

        this._selectedUnit = unitView
    }

    selectAction = (unitView: UnitView, action: Action) => {
        const {game, rangeView, _callbacks} = this

        console.log('Displaying attack range', unitView)

        rangeView.draw(unitView.player.color, game.getReachablePositionsForAction(action))

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
            const action = new AttackAction(this._selectedUnit.unit)
            this.selectAction(this._selectedUnit, action)
        }
    }

    moveMode = () => {
        this._mode = "move"
        if (this._selectedUnit) {
            this.selectMoveAction(this._selectedUnit)
        }
    }

    startTurn = () => {
        this._frozen = false
        const {game, iaManager, select, getUnitViewFromUnit} = this
        const activePlayer = game.getActivePlayer()
        const activeMesh = getUnitViewFromUnit(game.getActiveUnit())
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
        this.rangeView.draw(unitView.player.color, [state.position])
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
            previewSelectedAction,
            executeSelectedAction,
            getTarget,
            moveSelectedUnitTo
        } = this
        const target = getTarget(intersects)
        if (target) {
            if (_selectedUnit) {
                if (_selectedUnit === target?.unitView) {
                    unselect()
                } else if (_mode === "attack") {
                    previewSelectedAction(target)
                } else if (_mode === "preview") {
                    this._frozen = true
                    executeSelectedAction(target).then(() => {
                        trajectoryView.clear()
                        this._frozen = false
                    })
                } else if (_mode === "move" && !_frozen) {
                    trajectoryView.clear()
                    const p = game.world.getClosestPositionInWorld({x: intersects[0].point.x, z: intersects[0].point.z})
                    this._frozen = true
                    moveSelectedUnitTo(p).then(() => this._frozen = false)
                }
            } else {
                target.unitView && select(target.unitView)
            }
        }
    }

    raycast = (e: MouseEvent) => {

        if (e.button !== 0) {
            return
        }

        const {camera, raycaster} = this.context
        // 1. sets the mouse position with a coordinate system where the center
        //   of the screen is the origin
        const mouse = {
            x: (e.clientX / window.innerWidth) * 2 - 1,
            y: -(e.clientY / window.innerHeight) * 2 + 1
        }

        // 2. set the picking ray from the camera position and mouse coordinates
        raycaster.setFromCamera(mouse, camera)

        // 3. compute intersections (no 2nd parameter true anymore)
        const intersects = raycaster.intersectObjects(this.parent.children, true)
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
            this.handleLeftClick(intersects)
        }
    }
}

