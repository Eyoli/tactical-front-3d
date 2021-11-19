import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    Group,
    Material,
    Mesh,
    MeshStandardMaterial,
    Quaternion,
    QuaternionKeyframeTrack,
    Vector3,
    VectorKeyframeTrack
} from "three"
import {Position3D, Unit, World} from "../model/world"
import {LoopOnce} from "three/src/constants"

class UnitMesh {
    readonly mesh: Mesh
    readonly idle: AnimationAction
    move?: AnimationAction

    constructor(mesh: Mesh, idleAnimationClip: AnimationClip) {
        this.mesh = mesh
        const mixer = new AnimationMixer(mesh)
        this.idle = mixer.clipAction(idleAnimationClip)
    }

    computeMovingAnimation(path: Position3D[]) {
        const object = this
        const values: number[] = [], times: number[] = []
        path.forEach(({x, y, z}, i) => {
            if (i > 0 && y - path[i - 1].y > 0) {
                values.push(path[i - 1].x + 0.5, y + 0.5, path[i - 1].z + 0.5)
                times.push(values.length / 3)
            } else if (i > 0 && y - path[i - 1].y < 0) {
                values.push(x + 0.5, path[i - 1].y + 0.5, z + 0.5)
                times.push(values.length / 3)
            }
            values.push(x + 0.5, y + 0.5, z + 0.5)
            times.push(values.length / 3)
        })
        const vectorKF = new VectorKeyframeTrack('.position', times, values)
        const moveAnimationClip = new AnimationClip('move', -1, [vectorKF])
        const mixer = new AnimationMixer(object.mesh)

        const to = values.slice(values.length - 3)
        object.mesh.position.set(to[0], to[1], to[2])

        object.move = mixer.clipAction(moveAnimationClip)
        object.move.setLoop(LoopOnce, 0)
        mixer.addEventListener('finished', () => {
            object.move = undefined
        })
    }
}

const initUnit = (): UnitMesh => {
    const mesh = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({roughness: 0}))

    // animations
    const xAxis = new Vector3(1, 0, 0)
    const qInitial = new Quaternion().setFromAxisAngle(xAxis, 0)
    const qFinal = new Quaternion().setFromAxisAngle(xAxis, Math.PI)
    const quaternionKF = new QuaternionKeyframeTrack('.quaternion', [0, 1, 2], [qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w, qInitial.x, qInitial.y, qInitial.z, qInitial.w])
    const idleAnimationClip = new AnimationClip('idle', -1, [quaternionKF])

    return new UnitMesh(mesh, idleAnimationClip)
}

const FACES = [
    { // left
        uvRow: 0,
        dir: [-1, 0, 0],
        corners: [
            {pos: [0, 1, 0], uv: [0, 1]},
            {pos: [0, 0, 0], uv: [0, 0]},
            {pos: [0, 1, 1], uv: [1, 1]},
            {pos: [0, 0, 1], uv: [1, 0]},
        ],
    },
    { // right
        uvRow: 0,
        dir: [1, 0, 0],
        corners: [
            {pos: [1, 1, 1], uv: [0, 1]},
            {pos: [1, 0, 1], uv: [0, 0]},
            {pos: [1, 1, 0], uv: [1, 1]},
            {pos: [1, 0, 0], uv: [1, 0]},
        ],
    },
    { // bottom
        uvRow: 1,
        dir: [0, -1, 0],
        corners: [
            {pos: [1, 0, 1], uv: [1, 0]},
            {pos: [0, 0, 1], uv: [0, 0]},
            {pos: [1, 0, 0], uv: [1, 1]},
            {pos: [0, 0, 0], uv: [0, 1]},
        ],
    },
    { // top
        uvRow: 2,
        dir: [0, 1, 0],
        corners: [
            {pos: [0, 1, 1], uv: [1, 1]},
            {pos: [1, 1, 1], uv: [0, 1]},
            {pos: [0, 1, 0], uv: [1, 0]},
            {pos: [1, 1, 0], uv: [0, 0]},
        ],
    },
    { // back
        uvRow: 0,
        dir: [0, 0, -1],
        corners: [
            {pos: [1, 0, 0], uv: [0, 0]},
            {pos: [0, 0, 0], uv: [1, 0]},
            {pos: [1, 1, 0], uv: [0, 1]},
            {pos: [0, 1, 0], uv: [1, 1]},
        ],
    },
    { // front
        uvRow: 0,
        dir: [0, 0, 1],
        corners: [
            {pos: [0, 0, 1], uv: [0, 0]},
            {pos: [1, 0, 1], uv: [1, 0]},
            {pos: [0, 1, 1], uv: [0, 1]},
            {pos: [1, 1, 1], uv: [1, 1]},
        ],
    },
]

export type TextureInfos = {
    material: Material
    tileSize: number
    tileTextureHeight: number
    tileTextureWidth: number
}

type VoxelWorldOptions = {
    world: World,
    textureInfos: TextureInfos
}

export class VoxelWorld {
    private readonly world: World
    private readonly textureInfos: TextureInfos
    private readonly chunkIdToMesh = {}
    private readonly unitsToMesh: Map<Unit, UnitMesh> = new Map<Unit, UnitMesh>()
    readonly parent = new Group()

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
    }

    getChunkMesh = (x: number, y: number, z: number): Mesh => {
        const cellId = this.world.worldMap.computeChunkId({x, y, z})
        return this.chunkIdToMesh[cellId]
    }

    createCellMesh = (x: number, y: number, z: number): Mesh => {
        const cellId = this.world.worldMap.computeChunkId({x, y, z})
        const mesh = new Mesh<BufferGeometry, Material>(new BufferGeometry(), this.textureInfos.material)
        mesh.name = cellId
        this.chunkIdToMesh[cellId] = mesh
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
        const updatedCellIds = {}
        for (const offset of this.neighborOffsets) {
            const ox = x + offset[0]
            const oy = y + offset[1]
            const oz = z + offset[2]
            const cellId = this.world.worldMap.computeChunkId({x: ox, y: oy, z: oz})
            if (!updatedCellIds[cellId]) {
                updatedCellIds[cellId] = true
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
        let mesh = this.getChunkMesh(x, y, z)

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

    generateUnits = () => {
        const {parent, world, unitsToMesh} = this
        Array.from(world.unitsToPositions.entries()).forEach(({0: unit, 1: p}) => {
            const unitMesh = initUnit()
            unitMesh.idle.play()
            unitMesh.mesh.position.set(p.x + 0.5, p.y + 0.3, p.z + 0.5)
            parent.add(unitMesh.mesh)
            unitsToMesh.set(unit, unitMesh)
        })
    }

    moveUnit = () => {
        const {world, unitsToMesh} = this
        world.getUnits().forEach(unit => {
            const path = world.moveUnit(unit, {x: 9, z: 9})
            if (path) {
                unitsToMesh.get(unit)?.computeMovingAnimation(path)
                unitsToMesh.get(unit)?.move?.play()
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
                        for (const {dir, corners, uvRow} of FACES) {
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
}

