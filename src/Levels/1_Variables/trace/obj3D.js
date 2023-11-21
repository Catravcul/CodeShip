import { LineBasicMaterial, BufferGeometry, Line, Vector3 } from 'three'

import { Config } from "../../../Game/Config"
import { getNewQuestPos } from "./utils"


/**
 * trace creator, returns a 3d element representing the trace which can change to different colors and also its origin and end
 */
class Obj3D {

    #traceFollower = Config.ship
    getTraceFollowerWorldPos () { 
        const worldPos = this.#traceFollower.getWorldPosition(new Vector3())
        return worldPos
    }
    #originPos

    #material = new LineBasicMaterial( { color: 0x0000ff } )
    #geometry
    #trace
    get trace () {
        return this.#trace
    }

    constructor () {
        const traceFollowerWorldPos = this.getTraceFollowerWorldPos()
        this.#originPos = getNewQuestPos(traceFollowerWorldPos)
    
        const points = [traceFollowerWorldPos, this.#originPos]
        this.#geometry = new BufferGeometry().setFromPoints(points);

        this.#trace = new Line( this.#geometry, this.#material );
    }

    /**
     * changes the color of the 3d material to a random one
     * @returns {Obj3D}
     */
    changeColor () {
        const colors = ['blue', 'red', 'yellow', 'purple', 'red', 'violet', 'orange']
        const idx = Math.ceil(Math.random() * colors.length)
        this.#material.setValues({color: colors[idx]})

        return this
    }
    
    /**
     * changes the position of the origin of the trace
     * @returns {Obj3D}
     */
    changeOrigin () {
        const traceFollowerWorldPos = this.getTraceFollowerWorldPos()
        this.#originPos = getNewQuestPos(traceFollowerWorldPos)

        const points = [traceFollowerWorldPos, this.#originPos]
        this.#geometry.setFromPoints(points)
        this.#geometry.computeBoundingSphere()

        return this
    }

    /**
     * returns true if the trace follower is inside the area of the trace origin
     * @returns {boolean}
     */
    isTraceFollowerInOriginArea () {
        const traceFollowerWorldPos = this.getTraceFollowerWorldPos()
        const isDistanceOK = traceFollowerWorldPos.distanceTo(this.#originPos) < 30
        
        return isDistanceOK
    }
    
    /**
     * refresh the positions of the trace follower and the trace origin, usufull when the positions stored are mutating
     * @returns {Obj3D}
     */
    #updatePoints () {
        const traceFollowerWorldPos = this.getTraceFollowerWorldPos()
        const points = [traceFollowerWorldPos, this.#originPos]
        
        this.#geometry.setFromPoints(points)
        this.#geometry.computeBoundingSphere()
        
        return this
    }

    /**
     * refreshes properties like the positions used for creating the trace
     * @returns {Obj3D}
     */
    update () {
        this.#updatePoints()

        return this
    }
}

export default Obj3D