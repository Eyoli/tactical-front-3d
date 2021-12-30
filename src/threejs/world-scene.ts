import {BoxGeometry, BufferGeometry, Group, Intersection, Material, Mesh, MeshStandardMaterial, SpotLight} from "three"
import {Position2D, Position3D, Unit, UnitState} from "../domain/model/types"
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
    private readonly chunkIdToMesh: Map<string, Mesh> = new Map()
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

    getChunkMesh = (x: number, y: number, z: number): Mesh | undefined => {
        const cellId = this.world.worldMap.computeChunkId({x, y, z})
        return this.chunkIdToMesh.get(cellId)
    }

    createCellMesh = (x: number, y: number, z: number): Mesh => {
        const cellId = this.world.worldMap.computeChunkId({x, y, z})
        const mesh = new Mesh<BufferGeometry, Material>(new BufferGeometry(), this.textureInfos.material)
        mesh.name = cellId
        this.chunkIdToMesh.set(cellId, mesh)
        return mesh
    }

    // from
    // http://www.cse.chalmers.se/edu/year/2010/course/TDA361/grid.pdf
    intersectRay(start: Position3D, end: Position3D) {
        let dx = end.x - start.x
        let dy = end.y - start.y
        let dz = end.z - start.z
        const lenSq = dx * dx + dy * dy + dz * dz
        const len = Math.sqrt(lenSq)

        dx /= len
        dy /= len
        dz /= len

        let t = 0.0
        let ix = Math.floor(start.x)
        let iy = Math.floor(start.y)
        let iz = Math.floor(start.z)

        const stepX = (dx > 0) ? 1 : -1
        const stepY = (dy > 0) ? 1 : -1
        const stepZ = (dz > 0) ? 1 : -1

        const txDelta = Math.abs(1 / dx)
        const tyDelta = Math.abs(1 / dy)
        const tzDelta = Math.abs(1 / dz)

        const xDist = (stepX > 0) ? (ix + 1 - start.x) : (start.x - ix)
        const yDist = (stepY > 0) ? (iy + 1 - start.y) : (start.y - iy)
        const zDist = (stepZ > 0) ? (iz + 1 - start.z) : (start.z - iz)

        // location of nearest voxel boundary, in units of t
        let txMax = (txDelta < Infinity) ? txDelta * xDist : Infinity
        let tyMax = (tyDelta < Infinity) ? tyDelta * yDist : Infinity
        let tzMax = (tzDelta < Infinity) ? tzDelta * zDist : Infinity

        let steppedIndex = -1

        // main loop along raycast vector
        while (t <= len) {
            const voxel = this.world.worldMap.getVoxel({x: ix, y: iy, z: iz})
            if (voxel) {
                return {
                    position: [
                        start.x + t * dx,
                        start.y + t * dy,
                        start.z + t * dz,
                    ],
                    normal: [
                        steppedIndex === 0 ? -stepX : 0,
                        steppedIndex === 1 ? -stepY : 0,
                        steppedIndex === 2 ? -stepZ : 0,
                    ],
                }
            }

            // advance t to next nearest voxel boundary
            if (txMax < tyMax) {
                if (txMax < tzMax) {
                    ix += stepX
                    t = txMax
                    txMax += txDelta
                    steppedIndex = 0
                } else {
                    iz += stepZ
                    t = tzMax
                    tzMax += tzDelta
                    steppedIndex = 2
                }
            } else {
                if (tyMax < tzMax) {
                    iy += stepY
                    t = tyMax
                    tyMax += tyDelta
                    steppedIndex = 1
                } else {
                    iz += stepZ
                    t = tzMax
                    tzMax += tzDelta
                    steppedIndex = 2
                }
            }
        }
        return null
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
                let mesh = this.getChunkMesh(ox, oy, oz)
                if (!mesh) {
                    mesh = this.createCellMesh(ox, oy, oz)
                    this.parent.add(mesh)
                    mesh.position.set(x, y, z)
                }
                updateChunkGeometry(ox, oy, oz, chunkSize, mesh, textureInfos, getVoxel)
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

    handleUnitMove = (unitView: UnitView, p: Position2D) => {
        const {world, rangeLayer, _onUnitActionCallback} = this

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
        unitView.computeMovingAnimation(path, 3)
        unitView.move?.play()

        const state = world.getState(unitView.unit)
        if (_onUnitActionCallback && state) {
            _onUnitActionCallback(unitView.unit, state)
        }
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
        const {world, rangeLayer, selectionLight, createRangeMesh, _onUnitSelectionCallback} = this

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
        const {world, _mode, handleMoveActionSelection, handleAttackActionSelection, getUnitMesh, handleUnitMove} = this
        const unitView = intersects.map(i => getUnitMesh(i.object.uuid)).find(i => i != undefined)
        if (unitView) {
            _mode === "move" ? handleMoveActionSelection(unitView) : handleAttackActionSelection(unitView)
        } else if (intersects.length > 0 && this._selectedUnit?.isMoving) {
            const p = world.getClosestPosition({x: intersects[0].point.x, z: intersects[0].point.z})
            handleUnitMove(this._selectedUnit, p)
            this._selectedUnit = undefined
        }
    }
}

