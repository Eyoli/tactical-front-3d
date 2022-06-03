import {WorldMap} from "../src/domain/models/world-map"
import {Player, Unit, UnitType} from "../src/domain/models/types";
import {Game, GameBuilder} from "../src/domain/models/game";
import {GameViewInterface} from "../src/ui/models/types";

export const initWorldMap = (chunkSize: number, heightmap?: number[][], data?: number[][]) => {
    const worldMap = new WorldMap(chunkSize)

    for (let i = 0; i < worldMap.size; i++) {
        for (let j = 0; j < worldMap.size; j++) {
            worldMap.setVoxel({x: i, y: heightmap ? heightmap[i][j] : 0, z: j}, data ? data[i][j] : 1)
        }
    }
    return worldMap
}

export const aGameWithFlatWorldAndTwoPlayers = () => {
    const worldMap = initWorldMap(3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]])
    const player1: Player = {id: 1, name: "P1", color: '#ff0000', mode: 'human'}
    const player2: Player = {id: 1, name: "P2", color: '#00ff00', mode: 'human'}
    return new GameBuilder(worldMap)
        .addPlayers(player1, player2)
        .addUnit(aUnit(1), {x: 1, z: 1}, player1)
        .addUnit(aUnit(2), {x: 1, z: 2}, player2)
        .start()
}

export const aUnit = (id: number, type: UnitType = "warrior", moves: number = 1, jump: number = 1, rangeMax: number = 1): Unit => new Unit({
    id,
    name: "",
    type,
    moves,
    jump,
    hp: 10,
    weapon: {range: {min: 1, max: rangeMax, vMax: 1}, power: 1, area: 1}
})

export const gameViewMock = (): GameViewInterface => ({
    executeAction: jest.fn(() => Promise.resolve()),
    moveSelectedUnitAlong: jest.fn(() => Promise.resolve()),
    previewAction: jest.fn(),
    select: jest.fn(),
    selectAction: jest.fn(),
    selectMoveAction: jest.fn(),
    unselect: jest.fn(),
})

export const expectUnitToNotBeAbleToMove = (unit: Unit, game: Game) => expect(game.getState(unit).canMove).toEqual(false)
export const expectUnitToBeAbleToMove = (unit: Unit, game: Game) => expect(game.getState(unit).canMove).toEqual(true)