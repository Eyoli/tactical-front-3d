import * as THREE from "three"
import {VoxelWorldManager} from "./voxel-world-manager"

export const addInteractionListeners = (canvas: HTMLCanvasElement, manager: VoxelWorldManager, requestRenderIfNotRequested: () => void) => {

    let currentVoxel = 0
    let currentId: number

    document.querySelectorAll('#ui .tiles input[type=radio][name=voxel]').forEach((elem) => {
        elem.addEventListener('click', allowUncheck)
    })

    function allowUncheck() {
        if (this.id === currentId) {
            this.checked = false
            currentId = undefined
            currentVoxel = 0
        } else {
            currentId = this.id
            currentVoxel = parseInt(this.value)
        }
    }

    function getCanvasRelativePosition(event: any) {
        const rect = canvas.getBoundingClientRect()
        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height,
        }
    }

    function placeVoxel(event: PointerEvent) {
        const pos = getCanvasRelativePosition(event)
        const x = (pos.x / canvas.width) * 2 - 1
        const y = (pos.y / canvas.height) * -2 + 1  // note we flip Y

        const start = new THREE.Vector3()
        const end = new THREE.Vector3()
        start.setFromMatrixPosition(manager.camera.matrixWorld)
        end.set(x, y, 1).unproject(manager.camera)

        const intersection = manager.world.intersectRay(start, end)
        if (intersection) {
            const voxelId = event.shiftKey ? 0 : currentVoxel
            // the intersection point is on the face. That means
            // the math imprecision could put us on either side of the face.
            // so go half a normal into the voxel if removing (currentVoxel = 0)
            // our out of the voxel if adding (currentVoxel  > 0)
            const pos = intersection.position.map((v, ndx) => {
                return v + intersection.normal[ndx] * (voxelId > 0 ? 0.5 : -0.5)
            })
            manager.world.setVoxel(pos[0], pos[1], pos[2], voxelId)
            manager.updateVoxelGeometry(pos[0], pos[1], pos[2])
            requestRenderIfNotRequested()
        }
    }

    const mouse: any = {
        x: 0,
        y: 0,
    }

    function recordStartPosition(event: any) {
        mouse.x = event.clientX
        mouse.y = event.clientY
        mouse.moveX = 0
        mouse.moveY = 0
    }

    function recordMovement(event: any) {
        mouse.moveX += Math.abs(mouse.x - event.clientX)
        mouse.moveY += Math.abs(mouse.y - event.clientY)
    }

    function placeVoxelIfNoMovement(event: PointerEvent) {
        if (mouse.moveX < 5 && mouse.moveY < 5) {
            placeVoxel(event)
        }
        window.removeEventListener('pointermove', recordMovement)
        window.removeEventListener('pointerup', placeVoxelIfNoMovement)
    }

    canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        recordStartPosition(event)
        window.addEventListener('pointermove', recordMovement)
        window.addEventListener('pointerup', placeVoxelIfNoMovement)
    }, {passive: false})
    canvas.addEventListener('touchstart', (event) => {
        // prevent scrolling
        event.preventDefault()
    }, {passive: false})
}