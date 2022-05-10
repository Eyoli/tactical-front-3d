import {
    MathUtils,
    PlaneGeometry,
    PMREMGenerator,
    RepeatWrapping,
    Scene,
    TextureLoader,
    Vector3,
    WebGLRenderer
} from "three"
import {Water} from "three/examples/jsm/objects/Water"
import {Sky} from "three/examples/jsm/objects/Sky"
import {SceneContext} from "./context";
import {CSS3DObject} from "three/examples/jsm/renderers/CSS3DRenderer";

type SunConfiguration = {
    turbidity: number,
    rayleigh: number,
    mieCoefficient: number,
    mieDirectionalG: number,
    elevation: number,
    azimuth: number,
    exposure: number
}

export class MainScene {

    private waterView?: WaterView
    private skyView?: SkyView

    constructor(
        private readonly scene: Scene,
        private readonly context: SceneContext,
    ) {

        const element = document.createElement('div')
        element.className = 'action'
        element.textContent = "PLOP"
        const actions = new CSS3DObject(element)
        actions.position.set(0, 0, 0)
        scene.add(actions)
    }

    addWater(waterLevel = 0) {
        this.waterView = new WaterView(this.scene, waterLevel)
    }

    addSky() {
        this.skyView = new SkyView(this.scene, this.context.renderer, this.context.pmremGenerator, {elevation: 10})
        this.skyView.applyConfiguration()
    }

    update(delta: number) {

        //if (this.sky && this.sun) {
        // this.effectController.azimuth = (this.effectController.azimuth + 1) % 360
        // this.updateSky(renderer)
        //}
        this.waterView?.update(delta, this.skyView?.sun)
        this.context.controls.update()
    }
}

class WaterView {
    private readonly water: Water

    constructor(scene: Scene, waterLevel = 0) {
        const waterGeometry = new PlaneGeometry(1000, 1000)
        this.water = new Water(
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
                fog: scene.fog !== undefined
            }
        )

        this.water.rotation.x = -Math.PI / 2
        this.water.position.y = waterLevel + 0.5

        scene.add(this.water)
    }

    update(delta: number, sun?: Vector3) {
        sun && this.water.material.uniforms['sunDirection'].value.copy(sun).normalize()
        this.water.material.uniforms['time'].value += 0.1 * delta
    }
}

class SkyView {
    private configuration: SunConfiguration

    readonly sun = new Vector3()
    readonly sky = new Sky()

    constructor(
        private readonly scene: Scene,
        private readonly renderer: WebGLRenderer,
        private readonly pmremGenerator: PMREMGenerator,
        configuration?: {
            turbidity?: number,
            rayleigh?: number,
            mieCoefficient?: number,
            mieDirectionalG?: number,
            elevation?: number,
            azimuth?: number,
            exposure?: number,
        }) {
        this.configuration = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 1,
            azimuth: 180,
            exposure: 0.5,
            ...configuration
        }
        this.sky.scale.setScalar(10000)
        this.scene.add(this.sky)
    }

    updateConfiguration = (configuration: {
        turbidity?: number,
        rayleigh?: number,
        mieCoefficient?: number,
        mieDirectionalG?: number,
        elevation?: number,
        azimuth?: number,
        exposure?: number,
    }) => {
        this.configuration = {...this.configuration, ...configuration}
    }

    applyConfiguration = () => {
        const uniforms = this.sky.material.uniforms
        uniforms['turbidity'].value = this.configuration.turbidity
        uniforms['rayleigh'].value = this.configuration.rayleigh
        uniforms['mieCoefficient'].value = this.configuration.mieCoefficient
        uniforms['mieDirectionalG'].value = this.configuration.mieDirectionalG

        const phi = MathUtils.degToRad(90 - this.configuration.elevation)
        const theta = MathUtils.degToRad(this.configuration.azimuth)
        this.sun.setFromSphericalCoords(1, phi, theta)

        uniforms['sunPosition'].value.copy(this.sun)

        this.renderer.toneMappingExposure = this.configuration.exposure

        this.scene.environment = this.pmremGenerator.fromScene(this.sky as any as Scene).texture
    }

    update = () => {
        this.configuration.azimuth = (this.configuration.azimuth + 1) % 360
    }
}