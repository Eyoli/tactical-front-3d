import {BufferGeometry, Group, Intersection, Material, Mesh, Vector3} from "three"
import {Action, AttackAction, Position2D, Position3D, Unit} from "../domain/model/types"
import {initUnit, UnitView} from "./units"
import {TextureInfos, updateChunkGeometry} from "./textures"
import {World} from "../domain/model/world"
import {RangeView, TrajectoryView} from "./views"

type VoxelWorldOptions = {
    world: World,
    textureInfos: TextureInfos
}
type SelectionMode = 'move' | 'attack' | 'preview'
type WorldEvent = 'select' | 'unselect' | 'preview'
type WorldEventCallback = (...args: any) => void

const neighborOffsets = [
    [0, 0, 0], // self
    [-1, 0, 0], // left
    [1, 0, 0], // right
    [0, -1, 0], // down
    [0, 1, 0], // up
    [0, 0, -1], // back
    [0, 0, 1], // front
]
const toVector3D = ({x, y, z}: Position3D) => new Vector3(x, y, z)

export class WorldScene {
    private readonly world: World
    private readonly textureInfos: TextureInfos
    private readonly chunkIdToMesh: Map<string, Mesh<BufferGeometry, Material>> = new Map()
    private readonly unitsToMesh: Map<Unit, UnitView> = new Map<Unit, UnitView>()
    private readonly rangeView: RangeView
    readonly parent: Group
    private readonly unitLayer: Group
    private trajectoryView: TrajectoryView
    private _callbacks: Map<WorldEvent, WorldEventCallback> = new Map()

    private _selectedUnit?: UnitView
    private _selectedAction?: Action
    private _mode?: SelectionMode

    constructor({world, textureInfos}: VoxelWorldOptions) {
        this.world = world
        this.textureInfos = textureInfos

        this.parent = new Group()

        this.unitLayer = new Group()
        this.unitLayer.position.set(0.5, 0, 0.5)
        this.parent.add(this.unitLayer)

        this.rangeView = new RangeView(this.parent)
        this.trajectoryView = new TrajectoryView(world)
    }

    getChunkMesh = (x: number, y: number, z: number): Mesh<BufferGeometry, Material> | undefined => {
        const cellId = this.world.worldMap.computeChunkId({x, y, z})
        return this.chunkIdToMesh.get(cellId)
    }

    createCellMesh = (x: number, y: number, z: number): Mesh<BufferGeometry, Material> => {
        const cellId = this.world.worldMap.computeChunkId({x, y, z})
        const mesh = new Mesh<BufferGeometry, Material>(new BufferGeometry(), this.textureInfos.material)
        mesh.name = cellId
        this.chunkIdToMesh.set(cellId, mesh)
        return mesh
    }

    generateChunk(x: number, y: number, z: number) {
        const {chunkSize, getVoxel} = this.world.worldMap
        const {textureInfos} = this

        const updatedCellIds = new Map<string, boolean>()
        for (const offset of neighborOffsets) {
            const ox = x + offset[0]
            const oy = y + offset[1]
            const oz = z + offset[2]
            const cellId = this.world.worldMap.computeChunkId({x: ox, y: oy, z: oz})
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
        const {unitLayer, world, unitsToMesh} = this
        world.playersUnits.forEach((units, player) => {
            units.forEach(unit => {
                const p = world.getPosition(unit)
                if (p) {
                    const unitMesh = initUnit(unit, p, player)
                    unitMesh.idle.play()
                    unitLayer.add(unitMesh.mesh)
                    unitsToMesh.set(unit, unitMesh)
                }
            })
        })
    }

    update = (time: number) => {
        Array.from(this.unitsToMesh.values()).forEach(unitView => unitView.update(time))
        this.trajectoryView.update(time)
    }

    getUnitMesh = (uuid: string): UnitView | undefined => Array.from(this.unitsToMesh.values()).find((unitMesh) => unitMesh.childrenIds.indexOf(uuid) > 0)

    handleUnitMove = (p: Position2D) => {
        const {world, _callbacks, rangeView, _selectedUnit: unitView, select} = this

        if (!unitView) {
            console.log('No unit has been selected')
            return
        }

        // Verify that a path exists between the locations
        const path = world.moveUnit(unitView.unit, p)
        if (!path) {
            console.log(`Impossible to move unit (id=${unitView.unit.id}) to`, p, 'no path found')
            return
        }

        rangeView.clear()

        console.log(`Moving unit (id=${unitView.unit.id}) to`, p)
        unitView.startMovingToward(path, 5)

        const state = world.getState(unitView.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(unitView.unit, state)
        }

        select(unitView)
    }


    private previewUnitAction = (target: UnitView) => {
        const {world, _callbacks, rangeView, _selectedUnit, _selectedAction, trajectoryView} = this
        const p = world.getPosition(target.unit)

        if (!_selectedUnit) return
        if (!_selectedAction) return

        const actionResult = world.previewAction(_selectedAction, p)

        console.log("Action previewed", _selectedAction, p)

        const state = world.getState(_selectedUnit.unit)
        const callback = _callbacks.get('preview')
        if (callback && state) {
            callback(_selectedUnit.unit, actionResult.newStates.forEach((newState, unit) => ({
                state: world.getState(unit),
                newState,
                unit
            })))
        }

        _selectedAction.trajectory && trajectoryView.draw(_selectedUnit, target.mesh, actionResult.trajectory)
        rangeView.clear()
        rangeView.draw(_selectedUnit, [state.position])
        rangeView.draw(target, [world.getState(target.unit).position])

        this._mode = "preview"
    }

    private executeUnitAction = (target: UnitView) => {
        const {world, _callbacks, rangeView, trajectoryView, _selectedUnit, _selectedAction, select} = this
        const p = world.getPosition(target.unit)

        if (!_selectedUnit) return
        if (!_selectedAction) return

        world.executeAction(_selectedAction, p)

        console.log("Action executed", _selectedAction, p)

        const state = world.getState(_selectedUnit.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(_selectedUnit.unit, state)
        }

        rangeView.clear()
        trajectoryView.launchProjectile()
        select(_selectedUnit)
    }

    private handleMoveActionSelection = (unitView: UnitView) => {
        const {world, rangeView, _callbacks} = this

        rangeView.draw(unitView, world.getReachablePositions(unitView.unit))

        const state = world.getState(unitView.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            console.log('Selecting unit', unitView.unit, state)
            callback(unitView.unit, state)
        }

        this._selectedUnit = unitView
    }

    private handleAttackActionSelection = (unitView: UnitView) => {
        const {world, rangeView, _callbacks} = this

        console.log('Displaying attack range', unitView)

        const action = new AttackAction(unitView.unit)
        rangeView.draw(unitView, world.getReachablePositionsForAction(action))

        const state = world.getState(unitView.unit)
        const callback = _callbacks.get('select')
        if (callback && state) {
            callback(unitView.unit, state)
        }

        this._selectedUnit = unitView
        this._selectedAction = action
    }

    on = (event: WorldEvent, callback: WorldEventCallback) => this._callbacks.set(event, callback)

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

    private select = (unitView: UnitView) => {
        const callback = this._callbacks.get('select')
        const state = this.world.getState(unitView.unit)
        if (callback && state) {
            console.log('Selecting unit', unitView.unit, state)
            callback(unitView.unit, state)
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
            world,
            _mode,
            _selectedUnit,
            trajectoryView,
            select,
            unselect,
            previewUnitAction,
            executeUnitAction,
            getUnitMesh,
            handleUnitMove
        } = this
        const unitView = intersects.map(i => getUnitMesh(i.object.uuid)).find(i => i != undefined)
        if (unitView) {
            if (_selectedUnit) {
                if (_selectedUnit === unitView) {
                    unselect()
                } else if (_mode === "attack") {
                    previewUnitAction(unitView)
                } else if (_mode === "preview") {
                    executeUnitAction(unitView)
                }
            } else {
                select(unitView)
            }
        } else if (_mode === "move" && intersects.length > 0 && _selectedUnit?.isMoving) {
            trajectoryView.clear()
            const p = world.getClosestPosition({x: intersects[0].point.x, z: intersects[0].point.z})
            handleUnitMove(p)
        }
    }
}

