import {BoxGeometry, BufferGeometry, Group, Intersection, Material, Mesh, MeshStandardMaterial, SpotLight} from "three"
import {AttackAction, Position2D, Position3D, Unit, UnitState} from "../domain/model/types"
import {initUnit, UnitView} from "./units"
import {TextureInfos, updateChunkGeometry} from "./textures"
import {World} from "../domain/model/world"

type VoxelWorldOptions = {
    world: World,
    textureInfos: TextureInfos
}

const neighborOffsets = [
    [0, 0, 0], // self
    [-1, 0, 0], // left
    [1, 0, 0], // right
    [0, -1, 0], // down
    [0, 1, 0], // up
    [0, 0, -1], // back
    [0, 0, 1], // front
]

type UnitActionCallback = (unit: Unit, state: UnitState) => void
type SelectionMode = 'move' | 'attack'

export class WorldScene {
    private readonly world: World
    private readonly textureInfos: TextureInfos
    private readonly chunkIdToMesh: Map<string, Mesh<BufferGeometry, Material>> = new Map()
    private readonly unitsToMesh: Map<Unit, UnitView> = new Map<Unit, UnitView>()
    private _selectedUnit?: UnitView
    private readonly selectionLight: SpotLight
    readonly parent: Group
    private readonly unitLayer: Group
    private readonly rangeLayer: Group
    private _onUnitSelectionCallback?: UnitActionCallback
    private _onUnitActionCallback?: UnitActionCallback
    private _mode: SelectionMode = 'move'

    constructor({world, textureInfos}: VoxelWorldOptions) {
        this.world = world
        this.textureInfos = textureInfos

        this.parent = new Group()

        this.unitLayer = new Group()
        this.unitLayer.position.set(0.5, 0, 0.5)
        this.parent.add(this.unitLayer)

        this.rangeLayer = new Group()
        this.rangeLayer.position.set(0.5, 1, 0.5)
        this.parent.add(this.rangeLayer)

        this.selectionLight = this.initSelectionLight()
        this.parent.add(this.selectionLight)
    }

    private initSelectionLight = () => {
        const light = new SpotLight(0x0000FF, 1, 0, 0.025, 1, 0.0001)
        light.position.set(0, 30, 0)
        light.visible = false
        return light
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
        Array.from(this.unitsToMesh.values()).forEach((unit) => {
            unit.idle.getMixer().update(time)
            unit.move?.getMixer().update(time)
        })
    }

    getUnitMesh = (uuid: string): UnitView | undefined => Array.from(this.unitsToMesh.values()).find((unitMesh) => unitMesh.childrenIds.indexOf(uuid) > 0)

    handleUnitMove = (p: Position2D) => {
        const {world, rangeLayer, _onUnitActionCallback, _selectedUnit: unitView} = this

        if (!unitView) {
            console.log('No unit has been selected')
            return
        }

        // Verify that the position can be accessed
        const accessiblePositions = world.getReachablePositions(unitView.unit)
        if (!accessiblePositions.find(accessiblePosition => accessiblePosition.x === p.x && accessiblePosition.z === p.z)) {
            console.log(`Impossible to move unit (id=${unitView.unit.id}) to`, p, 'position is not accessible')
            return
        }

        // Verify that a path exists between the locations
        const path = world.moveUnit(unitView.unit, p)
        if (!path) {
            console.log(`Impossible to move unit (id=${unitView.unit.id}) to`, p, 'no path found')
            return
        }

        rangeLayer.remove(...rangeLayer.children)

        console.log(`Moving unit (id=${unitView.unit.id}) to`, p)
        unitView.startMovingToward(path, 3)

        const state = world.getState(unitView.unit)
        if (_onUnitActionCallback && state) {
            _onUnitActionCallback(unitView.unit, state)
        }

        this._selectedUnit = undefined
    }

    private handleUnitAction = (p: Position2D | Position3D) => {
        const {world, rangeLayer, _onUnitActionCallback, _selectedUnit} = this

        if (!_selectedUnit) return

        const target = world.getUnits([p])
        world.executeAction(new AttackAction(_selectedUnit?.unit), target)

        console.log('Action executed on ', target)
        const state = world.getState(_selectedUnit.unit)
        if (_onUnitActionCallback && state) {
            _onUnitActionCallback(_selectedUnit.unit, state)
        }

        rangeLayer.remove(...rangeLayer.children)
        this._selectedUnit = undefined
    }

    private createRangeMesh = (unitView: UnitView, p: Position3D): Mesh => {
        const mesh = new Mesh(new BoxGeometry(1, 0.1, 1), new MeshStandardMaterial({
            roughness: 0,
            color: unitView.player.color,
            opacity: 0.4,
            transparent: true
        }))
        mesh.position.set(p.x, p.y - 1, p.z)
        return mesh
    }

    private handleMoveActionSelection = (unitView: UnitView) => {
        const {world, rangeLayer, selectionLight, createRangeMesh, _onUnitSelectionCallback} = this

        console.log('Selecting unit', unitView)

        this._selectedUnit = unitView
        selectionLight.visible = true
        selectionLight.target = unitView?.mesh

        rangeLayer.remove(...rangeLayer.children)
        world.getReachablePositions(unitView.unit).map(p => createRangeMesh(unitView, p)).forEach(mesh => rangeLayer.add(mesh))
        const state = world.getState(unitView.unit)
        if (_onUnitSelectionCallback && state) {
            _onUnitSelectionCallback(unitView.unit, state)
        }
    }

    private handleAttackActionSelection = (unitView: UnitView) => {
        const {world, rangeLayer, createRangeMesh, _onUnitSelectionCallback} = this

        console.log('Displaying attack range', unitView)

        rangeLayer.remove(...rangeLayer.children)
        world.getReachablePositionsForWeapon(unitView.unit).map(p => createRangeMesh(unitView, p)).forEach(mesh => rangeLayer.add(mesh))
        const state = world.getState(unitView.unit)
        if (_onUnitSelectionCallback && state) {
            _onUnitSelectionCallback(unitView.unit, state)
        }
    }

    onUnitSelection = (callback: UnitActionCallback) => this._onUnitSelectionCallback = callback
    onUnitAction = (callback: UnitActionCallback) => this._onUnitActionCallback = callback

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

    handleLeftClick = (intersects: Intersection[]) => {
        const {
            world,
            _mode,
            _selectedUnit,
            handleMoveActionSelection,
            handleAttackActionSelection,
            handleUnitAction,
            getUnitMesh,
            handleUnitMove
        } = this
        const unitView = intersects.map(i => getUnitMesh(i.object.uuid)).find(i => i != undefined)
        if (unitView) {
            if(_mode === "move") {
                handleMoveActionSelection(unitView)
            } else if (_selectedUnit === unitView) {
                handleAttackActionSelection(unitView)
            } else {
                const position = world.getPosition(unitView.unit)
                handleUnitAction(position)
            }
        } else if (intersects.length > 0 && _selectedUnit?.isMoving) {
            const p = world.getClosestPosition({x: intersects[0].point.x, z: intersects[0].point.z})
            handleUnitMove(p)
        }
    }
}

