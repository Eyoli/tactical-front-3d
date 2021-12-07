import {DoubleSide, Material, MeshStandardMaterial, NearestFilter, Texture, TextureLoader} from "three"

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