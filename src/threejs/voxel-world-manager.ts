import {
    BoxGeometry,
    Clock,
    DirectionalLight,
    MathUtils, Mesh, MeshStandardMaterial,
    PerspectiveCamera,
    PlaneGeometry, PMREMGenerator,
    Renderer,
    RepeatWrapping,
    Scene,
    TextureLoader,
    Vector3,
    WebGLRenderer
} from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {VoxelWorld} from "./voxel-world"
import {Water} from "three/examples/jsm/objects/Water"
import {Sky} from "three/examples/jsm/objects/Sky"

const clock = new Clock()

const updateSky = (effectController: any, renderer: WebGLRenderer, sky: Sky, sun: Vector3, water?: Water) => {

    const uniforms = sky.material.uniforms
    uniforms['turbidity'].value = effectController.turbidity
    uniforms['rayleigh'].value = effectController.rayleigh
    uniforms['mieCoefficient'].value = effectController.mieCoefficient
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG

    const phi = MathUtils.degToRad(90 - effectController.elevation)
    const theta = MathUtils.degToRad(effectController.azimuth)
    sun.setFromSphericalCoords(1, phi, theta)

    uniforms['sunPosition'].value.copy(sun)
    water?.material.uniforms['sunDirection'].value.copy(sun).normalize()

    renderer.toneMappingExposure = effectController.exposure
}

const resizeRendererToDisplaySize = (renderer: Renderer) => {
    const canvas = renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height
    if (needResize) {
        renderer.setSize(width, height, false)
    }
    return needResize
}

export class VoxelWorldManager {
    private readonly voxelWorld: VoxelWorld
    private readonly scene: Scene
    private readonly camera: PerspectiveCamera
    private readonly controls: OrbitControls
    private effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 15,
        azimuth: 180,
        exposure: 0.5
    }

    private water?: Water
    private sky?: Sky
    private sun?: Vector3

    constructor(
        voxelWorld: VoxelWorld,
        camera: PerspectiveCamera,
        controls: OrbitControls) {
        this.voxelWorld = voxelWorld

        const scene = new Scene()
        scene.add((voxelWorld.parent))

        this.scene = scene
        this.camera = camera
        this.controls = controls
    }

    addLight(x: number, y: number, z: number) {
        const color = 0xFFFFFF
        const intensity = 1
        const light = new DirectionalLight(color, intensity)
        light.position.set(x, y, z)
        this.scene.add(light)
    }

    addWater() {
        const waterGeometry = new PlaneGeometry(10000, 10000)

        const water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new TextureLoader().load('waternormals.jpg', function (texture) {
                    texture.wrapS = texture.wrapT = RepeatWrapping
                }),
                sunDirection: new Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        )

        water.rotation.x = -Math.PI / 2

        this.scene.add(water)
        this.water = water
    }

    addSky(renderer: WebGLRenderer) {
        this.sky = new Sky()
        this.sky.scale.setScalar(10000)
        this.scene.add(this.sky)

        this.sun = new Vector3()

        updateSky(this.effectController, renderer, this.sky, this.sun, this.water)
        // const color = 0xFFFFFF
        // const sunlight = new DirectionalLight(color, 1)
        // sunlight.position.set(this.sun.x, this.sun.y, this.sun.z)
        // this.scene.add(sunlight)
    }

    generateChunk(x: number, y: number, z: number) {
        this.voxelWorld.generateChunk(x, y, z)
        this.voxelWorld.generateUnits()
    }

    render(renderer: WebGLRenderer) {
        const delta = clock.getDelta()
        if (this.water) this.water.material.uniforms['time'].value += 0.1 / 60.0

        if (this.sky && this.sun) {
            this.effectController.azimuth = (this.effectController.azimuth + 1) % 360
            updateSky(this.effectController, renderer, this.sky, this.sun, this.water)
        }


        // if (resizeRendererToDisplaySize(renderer)) {
        //     const canvas = renderer.domElement
        //     this.camera.aspect = canvas.clientWidth / canvas.clientHeight
        //     this.camera.updateProjectionMatrix()
        // }

        this.voxelWorld.update(delta)
        this.controls.update()
        renderer.render(this.scene, this.camera)
    }
}