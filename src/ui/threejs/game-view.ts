import {BufferGeometry, Group, Intersection, Material, Mesh, Scene} from "three"
import {Position3D, Unit, UnitState} from "../../domain/models/types"
import {initUnit, UnitView} from "./units"
import {TextureInfos, updateChunkGeometry} from "./textures"
import {RangeView, TrajectoryView} from "./views"
import {GameViewInterface, Target} from "../models/types"
import {toVector3} from "./utility";
import {SceneContext} from "./context";
import {Game} from "../../domain/models/game";
import {WorldMap} from "../../domain/models/world-map";
import {ActionResult} from "../../domain/models/actions";

const neighborOffsets = [
    [0, 0, 0], // self
    [-1, 0, 0], // left
    [1, 0, 0], // right
    [0, -1, 0], // down
    [0, 1, 0], // up
    [0, 0, -1], // back
    [0, 0, 1], // front
]

export class GameView implements GameViewInterface {
    private readonly worldMesh: Mesh<BufferGeometry, Material>
    private readonly unitsToMesh: Map<Unit, UnitView> = new Map<Unit, UnitView>()
    private readonly rangeView: RangeView
    readonly parent: Group
    private readonly unitLayer: Group
    private trajectoryView: TrajectoryView

    constructor(
        scene: Scene,
        private readonly context: SceneContext,
        private readonly textureInfos: TextureInfos
    ) {
        this.parent = new Group()
        scene.add((this.parent))

        this.unitLayer = new Group()
        this.unitLayer.position.set(0.5, 0, 0.5)
        this.parent.add(this.unitLayer)

        this.rangeView = new RangeView(this.parent)
        this.trajectoryView = new TrajectoryView()

        this.worldMesh = new Mesh<BufferGeometry, Material>(new BufferGeometry(), this.textureInfos.material)
        this.parent.add(this.worldMesh)
        this.worldMesh.position.set(0, 0, 0)
    }

    generateChunk(world: WorldMap) {
        const {size, getVoxel} = world
        const {textureInfos} = this

        const updatedCellIds = new Map<string, boolean>()
        for (const offset of neighborOffsets) {
            const ox = offset[0]
            const oy = offset[1]
            const oz = offset[2]
            const cellId = "1"
            if (!updatedCellIds.get(cellId)) {
                updatedCellIds.set(cellId, true)
                updateChunkGeometry(ox, oy, oz, size, this.worldMesh, textureInfos, getVoxel)
            }
        }
    }

    generateUnits = (game: Game) => {
        const {unitLayer, unitsToMesh} = this
        game.playersUnits.forEach((units, player) => {
            units.forEach(unit => {
                const p = game.getPosition(unit)
                if (p) {
                    const unitMesh = initUnit(unit, p, player)
                    unitMesh.idle.play()
                    unitLayer.add(unitMesh.mesh)
                    unitsToMesh.set(unit, unitMesh)
                }
            })
        })
    }

    update = (time: number) => {
        Array.from(this.unitsToMesh.values()).forEach(unitView => unitView.update(time))
        this.trajectoryView.update(time)
    }

    getUnitViewFromUnit = (unit: Unit) => {
        const mesh = this.unitsToMesh.get(unit)
        if (!mesh) throw new Error(`Unit ${unit} has no mesh`)
        return mesh
    }

    getTarget = (game: Game, intersects: Intersection[]): Target | undefined => {
        const unitView = intersects
            .map(i => Array.from(this.unitsToMesh.values())
                .find((unitMesh) => unitMesh.childrenIds.indexOf(i.object.uuid) > 0))
            .find(i => i != undefined)
        if (unitView) {
            return {
                unit: unitView.unit
            }
        } else if (intersects.length > 0) {
            return {
                position: game.world.getClosestPositionInWorld({x: intersects[0].point.x, z: intersects[0].point.z})
            }
        }
        return undefined
    }

    moveSelectedUnitAlong = (selectedUnitState: UnitState, path: Position3D[]): Promise<void> => {
        const {rangeView, select, getUnitViewFromUnit} = this

        rangeView.clear()

        select(selectedUnitState.unit, selectedUnitState.position)

        const selectedUnitView = getUnitViewFromUnit(selectedUnitState.unit)
        return selectedUnitView.startMovingToward(path, 5)
    }

    previewAction = (selectedUnitState: UnitState, actionResult: ActionResult, position: Position3D): void => {
        const {rangeView, trajectoryView, getUnitViewFromUnit} = this

        const unitView = getUnitViewFromUnit(selectedUnitState.unit)

        actionResult.trajectory && trajectoryView.draw(unitView, toVector3(position), actionResult.trajectory)
        rangeView.clear()
        rangeView.draw(unitView.player.color, [selectedUnitState.position])
        rangeView.draw('#000000', [position])
    }

    executeAction = (selectedUnitState: UnitState, actionResult: ActionResult, position: Position3D): Promise<void> => {
        const {
            rangeView,
            trajectoryView,
            select,
            getUnitViewFromUnit
        } = this

        actionResult.newStates.forEach((newState, unit) => {
            if (newState.dead) {
                const unitView = getUnitViewFromUnit(unit)
                console.log("Unit is dead", unit)
                unitView.die()
            }
        })

        rangeView.clear()
        select(selectedUnitState.unit, selectedUnitState.position)

        const selectedUnitView = getUnitViewFromUnit(selectedUnitState.unit)
        return selectedUnitView.startAttacking(toVector3(position), trajectoryView, 1)
            .then(() => {
                trajectoryView.clear()
            })
    }

    selectMoveAction = (unit: Unit, reachablePositions: Position3D[]): void => {
        const {rangeView, getUnitViewFromUnit} = this

        const unitView = getUnitViewFromUnit(unit)
        rangeView.draw(unitView.player.color, reachablePositions)
    }

    selectAction = (unit: Unit, reachablePositions: Position3D[]): void => {
        const {rangeView, getUnitViewFromUnit} = this

        const unitView = getUnitViewFromUnit(unit)
        rangeView.draw(unitView.player.color, reachablePositions)
    }

    select = (unit: Unit, position: Position3D): void => {
        const unitView = this.getUnitViewFromUnit(unit)
        this.rangeView.draw(unitView.player.color, [position])
    }

    unselect = (): void => {
        this.trajectoryView.clear()
        this.rangeView.clear()
    }
}


