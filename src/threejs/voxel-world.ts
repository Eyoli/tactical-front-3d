import {
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    Group,
    Intersection,
    Material,
    Mesh,
    MeshStandardMaterial,
    SpotLight
} from "three"
import {Position2D, Position3D, Unit, World} from "../domain/model/world"
import {initUnit, UnitView} from "./units"
import {TextureInfos} from "./textures"

type VoxelWorldOptions = {
    world: World,
    textureInfos: TextureInfos
}

export class VoxelWorld {
    private readonly world: World
    private readonly textureInfos: TextureInfos
    private readonly chunkIdToMesh: Map<string, Mesh> = new Map()
    private readonly unitsToMesh: Map<Unit, UnitView> = new Map<Unit, UnitView>()
    private selectedUnit?: UnitView
    private readonly selectionLight: SpotLight
    readonly parent: Group
    private readonly unitLayer: Group
    private readonly rangeLayer: Group

    private readonly neighborOffsets = [
        [0, 0, 0], // self
        [-1, 0, 0], // left
        [1, 0, 0], // right
        [0, -1, 0], // down
        [0, 1, 0], // up
        [0, 0, -1], // back
        [0, 0, 1], // front
    ]

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
        const updatedCellIds = new Map<string, boolean>()
        for (const offset of this.neighborOffsets) {
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
                    mesh.position.set(ox, oy, oz)
                }
                this.updateChunkGeometry(ox, oy, oz)
            }
        }
    }

    private updateChunkGeometry(x: number, y: number, z: number) {
        const {chunkSize} = this.world.worldMap
        const cellX = Math.floor(x / chunkSize)
        const cellY = Math.floor(y / chunkSize)
        const cellZ = Math.floor(z / chunkSize)
        const mesh = this.getChunkMesh(x, y, z)

        if (mesh) {
            const geometry = mesh.geometry
            const {positions, normals, uvs, indices} = this.generateGeometryDataForChunk(cellX, cellY, cellZ)
            const positionNumComponents = 3
            geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), positionNumComponents))
            const normalNumComponents = 3
            geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), normalNumComponents))
            const uvNumComponents = 2
            geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), uvNumComponents))
            geometry.setIndex(indices)
            geometry.computeBoundingSphere()
        }
    }

    generateUnits = () => {
        const {unitLayer, world, unitsToMesh} = this
        world.units.forEach((unit) => {
            const p = world.unitsToPositions.get(unit.id)
            if (p) {
                const unitMesh = initUnit(unit, p)
                unitMesh.idle.play()
                unitLayer.add(unitMesh.mesh)
                unitsToMesh.set(unit, unitMesh)
            }
        })
    }

    private generateGeometryDataForChunk(cellX: number, cellY: number, cellZ: number) {
        const {tileSize, tileTextureWidth, tileTextureHeight} = this.textureInfos
        const {chunkSize} = this.world.worldMap
        const positions = []
        const normals = []
        const uvs = []
        const indices = []
        const startX = cellX * chunkSize
        const startY = cellY * chunkSize
        const startZ = cellZ * chunkSize

        for (let y = 0; y < chunkSize; ++y) {
            const voxelY = startY + y
            for (let z = 0; z < chunkSize; ++z) {
                const voxelZ = startZ + z
                for (let x = 0; x < chunkSize; ++x) {
                    const voxelX = startX + x
                    const voxel = this.world.worldMap.getVoxel({x: voxelX, y: voxelY, z: voxelZ})
                    if (voxel) {
                        // voxel 0 is sky (empty) so for UVs we start at 0
                        const uvVoxel = voxel - 1
                        // There is a voxel here but do we need faces for it?
                        for (const {dir, corners, uvRow} of this.textureInfos.faces) {
                            const neighbor = this.world.worldMap.getVoxel(
                                {
                                    x: voxelX + dir[0],
                                    y: voxelY + dir[1],
                                    z: voxelZ + dir[2]
                                })
                            if (!neighbor) {
                                // this voxel has no neighbor in this direction so we need a face.
                                const ndx = positions.length / 3
                                for (const {pos, uv} of corners) {
                                    positions.push(pos[0] + x, pos[1] + y, pos[2] + z)
                                    normals.push(...dir)
                                    uvs.push(
                                        (uvVoxel + uv[0]) * tileSize / tileTextureWidth,
                                        1 - (uvRow + 1 - uv[1]) * tileSize / tileTextureHeight)
                                }
                                indices.push(
                                    ndx, ndx + 1, ndx + 2,
                                    ndx + 2, ndx + 1, ndx + 3,
                                )
                            }
                        }
                    }
                }
            }
        }

        return {
            positions,
            normals,
            uvs,
            indices,
        }
    }

    update = (time: number) => {
        Array.from(this.unitsToMesh.values()).forEach((unit) => {
            unit.idle.getMixer().update(time)
            unit.move?.getMixer().update(time)
        })
    }

    getUnitMesh = (uuid: string): UnitView | undefined => Array.from(this.unitsToMesh.values()).find((unitMesh) => unitMesh.childrenIds.indexOf(uuid) > 0)

    handleUnitMove = (unitMesh: UnitView, p: Position2D) => {
        const {world, rangeLayer} = this

        // Verify that the position can be accessed
        const accessiblePositions = world.getAccessiblePositions(unitMesh.unit)
        if (!accessiblePositions.find(accessiblePosition => accessiblePosition.x === p.x && accessiblePosition.z === p.z)) {
            console.log(`Impossible to move unit (id=${unitMesh.unit.id}) to`, p, 'position is not accessible')
            return
        }

        // Verify that a path exists between the locations
        const path = world.moveUnit(unitMesh.unit, p)
        if (!path) {
            console.log(`Impossible to move unit (id=${unitMesh.unit.id}) to`, p, 'no path found')
            return
        }

        rangeLayer.remove(...rangeLayer.children)

        console.log(`Moving unit (id=${unitMesh.unit.id}) to`, p)
        unitMesh.computeMovingAnimation(path, 2)
        unitMesh.move?.play()
    }

    private createRangeMesh = (p: Position3D): Mesh => {
        const mesh = new Mesh(new BoxGeometry(1, 0.1, 1), new MeshStandardMaterial({
            roughness: 0,
            color: "#ff0000"
        }))
        mesh.position.set(p.x, p.y - 1, p.z)
        return mesh
    }

    private handleUnitSelection = (unitView: UnitView) => {
        const {world, rangeLayer, selectionLight, createRangeMesh} = this

        console.log('Selecting unit', unitView)

        this.selectedUnit = unitView
        selectionLight.visible = true
        selectionLight.target = unitView?.mesh

        rangeLayer.remove(...rangeLayer.children)
        world.getAccessiblePositions(unitView.unit).map(p => createRangeMesh(p)).forEach(mesh => rangeLayer.add(mesh))
    }

    handleClick = (intersects: Intersection[]) => {
        const {world, handleUnitSelection, getUnitMesh, handleUnitMove} = this
        const unitView = intersects.map(i => getUnitMesh(i.object.uuid)).find(i => i != undefined)
        if (unitView) {
            handleUnitSelection(unitView)
        } else if (intersects.length > 0 && this.selectedUnit?.isMoving) {
            const p = world.getClosestPosition({x: intersects[0].point.x, z: intersects[0].point.z})
            handleUnitMove(this.selectedUnit, p)
        }
    }
}

