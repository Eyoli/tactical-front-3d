import {isPositionWithinWeaponRange} from "../../../../src/domain/algorithm/utility";
import {Weapon} from "../../../../src/domain/models/weapons";
import {WorldMap} from "../../../../src/domain/models/world-map";

describe('Algorithm utility', () => {

    describe('Range check', () => {

        const world = new WorldMap(5)
        const weapon: Weapon = {
            range: {
                min: 1,
                max: 2,
                vMax: 10
            },
            area: 1,
            power: 1,
        }

        it('should return true when in range', () => {
            const source = {x: 2, y: 1, z: 2}
            const target = {x: 3, y: 1, z: 2}

            expect(isPositionWithinWeaponRange(weapon, world, source, target)).toEqual(true)
        })

        it('should return false when target is too close', () => {
            const source = {x: 2, y: 1, z: 2}
            const target = {x: 2, y: 1, z: 2}

            expect(isPositionWithinWeaponRange(weapon, world, source, target)).toEqual(false)
        })

        it('should return false when target is too far', () => {
            const source = {x: 2, y: 1, z: 2}
            const target = {x: 5, y: 1, z: 2}

            expect(isPositionWithinWeaponRange(weapon, world, source, target)).toEqual(false)
        })
    })
})