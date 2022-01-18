import {
    BufferAttribute, BufferGeometry,
    DoubleSide,
    Material,
    Mesh,
    MeshStandardMaterial,
    NearestFilter,
    Texture,
    TextureLoader
} from "three"
import {Position3D} from "../../domain/model/types"

export type TextureInfos = {
    material: Material
    tileSize: number
    tileTextureHeight: number
    tileTextureWidth: number
    faces: any[]
}

export const loadMinimalTexture = (onLoad?: ((texture: Texture) => void) | undefined): TextureInfos => {
    const loader = new TextureLoader()
    const texture = loader.load('images/flourish-cc-by-nc-sa.png', onLoad)
    texture.magFilter = NearestFilter
    texture.minFilter = NearestFilter
    return {
        material: new MeshStandardMaterial({
            map: texture,
            side: DoubleSide,
            alphaTest: 0.1,
            transparent: true,
        }),
        tileSize: 16,
        tileTextureWidth: 256,
        tileTextureHeight: 64,
        faces: [
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
    }
}

export const loadImprovedTexture = (onLoad?: ((texture: Texture) => void) | undefined): TextureInfos => {
    const loader = new TextureLoader()
    const texture = loader.load('images/6524.png', onLoad)
    texture.magFilter = NearestFilter
    texture.minFilter = NearestFilter
    return {
        material: new MeshStandardMaterial({
            map: texture,
            side: DoubleSide,
            alphaTest: 0.1,
            transparent: true,
        }),
        tileSize: 32,
        tileTextureWidth: 512,
        tileTextureHeight: 1024,
        faces: [
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
                uvRow: 0,
                dir: [0, -1, 0],
                corners: [
                    {pos: [1, 0, 1], uv: [1, 0]},
                    {pos: [0, 0, 1], uv: [0, 0]},
                    {pos: [1, 0, 0], uv: [1, 1]},
                    {pos: [0, 0, 0], uv: [0, 1]},
                ],
            },
            { // top
                uvRow: 0,
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
    }
}

export const updateChunkGeometry = (
    x: number,
    y: number,
    z: number,
    chunkSize: number,
    mesh: Mesh<BufferGeometry, Material>,
    textureInfos: TextureInfos,
    getVoxel: ({x, y, z}: Position3D) => number) => {
    const cellX = Math.floor(x / chunkSize)
    const cellY = Math.floor(y / chunkSize)
    const cellZ = Math.floor(z / chunkSize)

    const geometry = mesh.geometry
    const {
        positions,
        normals,
        uvs,
        indices
    } = generateGeometryDataForChunk(cellX, cellY, cellZ, chunkSize, textureInfos, getVoxel)
    const positionNumComponents = 3
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), positionNumComponents))
    const normalNumComponents = 3
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), normalNumComponents))
    const uvNumComponents = 2
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), uvNumComponents))
    geometry.setIndex(indices)
    geometry.computeBoundingSphere()
}

const generateGeometryDataForChunk = (chunkX: number, chunkY: number, chunkZ: number, chunkSize: number, {
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
    faces
}: TextureInfos, getVoxel: ({x, y, z}: Position3D) => number) => {
    const positions = []
    const normals = []
    const uvs = []
    const indices = []
    const startX = chunkX * chunkSize
    const startY = chunkY * chunkSize
    const startZ = chunkZ * chunkSize

    for (let y = 0; y < chunkSize; ++y) {
        const voxelY = startY + y
        for (let z = 0; z < chunkSize; ++z) {
            const voxelZ = startZ + z
            for (let x = 0; x < chunkSize; ++x) {
                const voxelX = startX + x
                const voxel = getVoxel({x: voxelX, y: voxelY, z: voxelZ})
                if (voxel) {
                    // voxel 0 is sky (empty) so for UVs we start at 0
                    const uvVoxel = voxel - 1
                    // There is a voxel here but do we need faces for it?
                    for (const {dir, corners, uvRow} of faces) {
                        const neighbor = getVoxel(
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