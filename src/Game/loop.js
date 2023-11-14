
export default class GameLoop {

    /**
     * functions to be executed in the game loop
     */
    static #actions = {}

    /**
     * id for action added
     */
    static #lastId = 0

    /**
     * ids setted free by action remove
     */
    static #reusableIds = []

    /**
     * adds a function to the loop
     * @param {function} pAction 
     * @returns {number} id to remove the added action
     */
    static addAction = (pAction) => {
        if (typeof pAction == "function") {
            const id = GameLoop.#reusableIds[0] || ++GameLoop.#lastId
            GameLoop.#reusableIds.shift()
            GameLoop.#actions[id] = pAction
            return id
        } else {
            throw new TypeError('a function expected')
        }
    }
    
    /**
     * adds a function to the loop
     * @param {number} pId 
     */
    static removeAction = (pId) => {
        delete GameLoop.#actions[pId]
        GameLoop.#reusableIds.push(pId)
    }

    static #isLoopRunning = false

    /**
     * function to initialize an infinite loop in charge of the game updates
     */
    static #loop = () => {
        Object.values(GameLoop.#actions).forEach(action => action())
        requestAnimationFrame(GameLoop.#loop)
    }

    /**
     * starts the infinity loop if not already started
     */
    static startLoop = () => {
        if (!GameLoop.#isLoopRunning) {
            GameLoop.#loop()
            GameLoop.#isLoopRunning = true
        }
    }

}