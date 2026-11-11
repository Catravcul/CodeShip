import { LeveledObject } from "../leveled-object"

export class HolisticCast {
        /**
     * @type {LeveledObject}
     */
        #owner
    /**
     * @type {LeveledObject}
     */
    #target
    /**
     * @type {Set<Cast>}
    */
   #castsPool = new Set()
   getCasts = () => {
    const casts = []
    this.#castsPool.forEach(element => {
        const {execute, ...rest} = element
        casts.push(rest)
    })
    return casts
    }
   /**
    * @type {Cast[]}
    */
   #castsUsed
   get castsUsed () { return this.#castsUsed }
    /**
     * @type {function[]}
     */
    #timeEffects = []
    get timeEffects () { return this.#timeEffects }
    #intervalId
    constructor () {
        this.start()
    }
    start = () => {
        this.#intervalId = setInterval(() => {
            const timeEffect = this.#timeEffects.shift()
            timeEffect()
        }, 1000)
    }
    stop = () => { clearInterval(this.#intervalId) }
    #execute = (action, props) => { 
        this.#castsPool.forEach(cast => cast.action == action && cast.execute(this.#owner, this.#target) ) 
    }
    get execute () { return this.#execute }
}

class Casted {
    /**
     * @type {string}
     */
    #type
    get type () { return this.#type }
        /**
     * @type {string}
     */
    #name
    get name () { return this.#name }
        /**
     * @type {string}
     */
    #value
    get value () { return this.#value }
        /**
     * @type {string}
     */
        constructor (type, name, value, context) {
            this.#type = type
            this.#name = name
            this.#value = value
            this.#context = context
        }
}

class Cast {
    /**
     * @type {string}
     */
    #action
    get action () { return this.#action }
    #context
    get context () { return this.#context }

    constructor (action, context) {
        this.#action = action
        this.#context = context
    }
    /**
     * 
     * @param {LeveledObject} owner 
     * @param {LeveledObject} target 
     * @param {Cast[]} olderCasts 
     * @param {function} addTimeEffect
     */
    #execute = (owner, target, {castsUsed, setCastsUsed}, {timeEffect, setTimeEffect}, props) => {}
    get execute () { return this.#execute }
}
const action1 = 'declare/var/number'
const action2 = 'declare/var/string'
const action3 = 'declare/let/function'
const action4 = 'declare/const/returned'
const action5 = 'declare/class/'
const action6 = 'declare/const/instance/'
const action7 = 'assign/action1/number'
const action8 = 'assign/action1/string'

const action = 'create, update, execute'
const types = 'var, let, const, control, loop, event'

const casts = []
const castsLevel = {
    first: [
        {}
    ]
}
const a = {
    type:"let",
    subType:"function",
    state:{},
    action:() => {}
}
const b = {
    type:"let",
    subType:"primitive",
    state:{},
    action:() => {}
}
const c = {
    type:"update",
    subType:"primitive",
    state:{},
    action:() => {}
}
const f = {
    type:"update",
    subType:"result",
    state:{},
    action:() => {}
}
const d = {
    type:"const",
    subType:"object",
    state:{},
    action:() => {}
}
const e = {
    type:"const",
    subType:"function",
    state:{},
    action:() => {}
}