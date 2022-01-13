import {
    Clock,
    MathUtils,
    PerspectiveCamera,
    PlaneGeometry,
    PMREMGenerator,
    Raycaster,
    RepeatWrapping,
    Scene,
    TextureLoader,
    Vector3,
    WebGLRenderer
} from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {GameScene} from "./game-scene"
import {Water} from "three/examples/jsm/objects/Water"
import {Sky} from "three/examples/jsm/objects/Sky"

const clock = new Clock()


export class MainScene {
    private readonly gameScene: GameScene
    readonly scene: Scene
    readonly camera: PerspectiveCamera
    private readonly controls: OrbitControls
    private readonly raycaster = new Raycaster()

    private effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 1,
        azimuth: 180,
        exposure: 0.5
    }

    private water?: Water
    private sky?: Sky
    private sun?: Vector3

    constructor(
        gameScene: GameScene,
        camera: PerspectiveCamera,
        controls: OrbitControls) {
        this.gameScene = gameScene

        const scene = new Scene()
        scene.add((gameScene.parent))

        this.scene = scene
        this.camera = camera
        this.controls = controls
    }

    addWater() {
        const waterGeometry = new PlaneGeometry(10000, 10000)

        const water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new TextureLoader().load('images/waternormals.jpg', function (texture) {
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

    addSky(elevation: number, renderer: WebGLRenderer, pmremGenerator: PMREMGenerator) {
        this.sky = new Sky()
        this.sky.scale.setScalar(10000)
        this.scene.add(this.sky)

        this.sun = new Vector3()
        this.effectController.elevation = elevation

        this.updateSky(renderer, pmremGenerator)
    }

    private updateSky = (renderer: WebGLRenderer, pmremGenerator: PMREMGenerator) => {
        const {scene, sky, effectController, sun, water} = this

        if (!sky || !sun || !pmremGenerator) return

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

        scene.environment = pmremGenerator.fromScene(this.sky as any as Scene).texture
    }

    generateChunk = (x: number, y: number, z: number) => {
        this.gameScene.generateChunk(x, y, z)
        this.gameScene.generateUnits()
    }

    render(renderer: WebGLRenderer) {
        const delta = clock.getDelta()
        if (this.water) this.water.material.uniforms['time'].value += 0.1 / 60.0

        if (this.sky && this.sun) {
            // this.effectController.azimuth = (this.effectController.azimuth + 1) % 360
            // this.updateSky(renderer)
        }

        this.gameScene.update(delta)
        this.controls.update()
        renderer.render(this.scene, this.camera)
    }

    raycast = (e: MouseEvent) => {

        if (e.button !== 0) {
            return
        }

        const {scene, camera, raycaster, gameScene} = this
        // 1. sets the mouse position with a coordinate system where the center
        //   of the screen is the origin
        const mouse = {
            x: (e.clientX / window.innerWidth) * 2 - 1,
            y: -(e.clientY / window.innerHeight) * 2 + 1
        }

        // 2. set the picking ray from the camera position and mouse coordinates
        raycaster.setFromCamera(mouse, camera)

        // 3. compute intersections (no 2nd parameter true anymore)
        const intersects = raycaster.intersectObjects(scene.children, true)
        if (intersects.length > 0) {
            /*
                An intersection has the following properties :
                    - object : intersected object (THREE.Mesh)
                    - distance : distance from camera to intersection (number)
                    - face : intersected face (THREE.Face3)
                    - faceIndex : intersected face index (number)
                    - point : intersection point (THREE.Vector3)
                    - uv : intersection point in the object's UV coordinates (THREE.Vector2)
            */
            gameScene.handleLeftClick(intersects)
        }
    }
}