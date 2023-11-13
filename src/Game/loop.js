
export class GameLoop {

    /**
     * functions to be executed in the game loop
     */
    static #actions = []

    /**
     * adds a function to the loop
     * @param {function} pAction 
     */
    static addAction = (pAction) => {
        if (typeof pAction == "function") GameLoop.#actions.push(pAction)
    }

    static #isLoopRunning = false

    /**
     * function to initialize an infinite loop in charge of the game updates
     */
    static #loop = () => {
        GameLoop.#actions.forEach(action => action())
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