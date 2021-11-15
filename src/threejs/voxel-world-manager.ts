import {
    Color,
    DirectionalLight,
    PerspectiveCamera,
    PlaneGeometry,
    PMREMGenerator,
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
    private readonly renderer: WebGLRenderer
    private pmremGenerator: PMREMGenerator
    private readonly camera: PerspectiveCamera
    private readonly controls: OrbitControls
    private water?: Water
    private parameters = {
        elevation: 2,
        azimuth: 180
    }

    constructor(
        voxelWorld: VoxelWorld,
        renderer: Renderer,
        camera: PerspectiveCamera,
        controls: OrbitControls) {
        this.voxelWorld = voxelWorld

        const scene = new Scene()
        scene.background = new Color('lightblue')
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

    addSky() {
        const sky = new Sky()
        sky.scale.setScalar(10000)
        this.scene.add(sky)

        const skyUniforms = sky.material.uniforms

        skyUniforms['turbidity'].value = 10
        skyUniforms['rayleigh'].value = 2
        skyUniforms['mieCoefficient'].value = 0.005
        skyUniforms['mieDirectionalG'].value = 0.8
        this.pmremGenerator = new PMREMGenerator(this.renderer)

        // this.updateSun()
    }

    // private updateSun() {
    //     const {water, scene, pmremGenerator, sky, sun, parameters} = this
    //
    //     const phi = MathUtils.degToRad(90 - parameters.elevation)
    //     const theta = MathUtils.degToRad(parameters.azimuth)
    //
    //     sun.setFromSphericalCoords(1, phi, theta)
    //
    //     sky.material.uniforms['sunPosition'].value.copy(sun)
    //     water?.material?.uniforms['sunDirection'].value.copy(sun).normalize()
    //
    //     scene.environment = pmremGenerator.fromScene(sky).texture
    // }

    generateChunk(x: number, y: number, z: number) {
        this.voxelWorld.generateChunk(x, y, z)
        this.voxelWorld.generateUnits()
    }

    render(renderer: Renderer) {
        const time = performance.now() * 0.001
        if (this.water) this.water.material.uniforms['time'].value += 0.1 / 60.0

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement
            this.camera.aspect = canvas.clientWidth / canvas.clientHeight
            this.camera.updateProjectionMatrix()
        }

        this.voxelWorld.render(time)
        this.controls.update()
        renderer.render(this.scene, this.camera)
    }
}