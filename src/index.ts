import * as THREE from 'three'
import {VoxelWorld} from './threejs/voxel-world'
import {VoxelWorldManager} from "./threejs/voxel-world-manager"
import {addInteractionListeners} from "./threejs/events"
import {BasicVoxelWorldGenerator} from "./threejs/voxel-world-generator"
import {stats} from "./monitoring/stats"

function main() {
    const canvas: HTMLCanvasElement = document.querySelector('#canvas')
    const renderer = new THREE.WebGLRenderer({canvas})
    renderer.setSize(window.innerWidth, window.innerHeight)

    const cellSize = 32
    const tileSize = 16
    const tileTextureWidth = 256
    const tileTextureHeight = 64
    const loader = new THREE.TextureLoader()
    const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/minecraft/flourish-cc-by-nc-sa.png', render)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter

    const world = new VoxelWorld({
        cellSize,
    })
    const worldGenerator = new BasicVoxelWorldGenerator(
        cellSize,
        cellSize,
        5,
        tileSize,
        tileTextureWidth,
        tileTextureHeight,
    )

    const material = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        transparent: true,
    })

    const manager = new VoxelWorldManager(world, worldGenerator, material, canvas, cellSize)
    manager.addLight(-1, 2, 4)
    manager.addLight(1, -1, -2)
    manager.generateVoxels()

    manager.updateVoxelGeometry(1, 1, 1)  // 0,0,0 will generate

    let renderRequested = false

    function render() {
        renderRequested = undefined

        if (manager.resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement
            manager.camera.aspect = canvas.clientWidth / canvas.clientHeight
            manager.camera.updateProjectionMatrix()
        }

        manager.controls.update()
        renderer.render(manager.scene, manager.camera)
    }

    render()

    function requestRenderIfNotRequested() {
        if (!renderRequested) {
            renderRequested = true
            requestAnimationFrame(render)
        }
    }

    manager.controls.addEventListener('change', requestRenderIfNotRequested)
    window.addEventListener('resize', requestRenderIfNotRequested)

    addInteractionListeners(canvas, manager, requestRenderIfNotRequested)

    stats()
}

main()