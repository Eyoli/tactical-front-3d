import {Camera, PMREMGenerator, Raycaster, WebGLRenderer} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

export class SceneContext {
    readonly pmremGenerator: PMREMGenerator

    constructor(
        readonly renderer: WebGLRenderer,
        readonly camera: Camera,
        readonly controls: OrbitControls,
        readonly raycaster: Raycaster,
    ) {
        this.pmremGenerator = new PMREMGenerator(renderer)
    }

    get canvas() {
        return this.renderer.domElement
    }
}