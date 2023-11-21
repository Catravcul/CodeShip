import { Vector3 } from "three";

/**
 * returns a random position with each value between 100 and 200 which could be positive or negative with the pShipWorldPosition as origin
 * @param { {x: number, y: number, z: number} } pShipWorldPos
 * @returns {Vector3}
 */
export const getNewQuestPos = ( {x: pX, y: pY, z: pZ} ) => {
    const getRandomNum = () => {
        const num = (Math.random() * 100) + 100
        const multiplier = Math.random() > 0.5 ? 1 : -1
        return (num * multiplier)
    }
    const x = getRandomNum(), y = getRandomNum(), z = getRandomNum()
    const pos = new Vector3((x + pX) ,(y + pY) , (z + pZ))
    return pos
}