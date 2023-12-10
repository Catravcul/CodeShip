import { useCallback, useEffect } from "react"
import ButtonLabeled from "./components/ButtonLabeled"

const button = { 
    label: { title:'t', placement:'bottom' },
    button: { content:'t', bgColor:'', onClick () {}, onPointerDown () {}, onPointerUp () {} }
}
const key = { key:'', handler() {} }

const TopNav = ({ leftButtons = [ button ], rightButtons = [ button ], downKeys = [ key ], upKeys = [ key ] }) => {

    const keydownHandler = useCallback(e => {
        downKeys.forEach(keyDown => {
            if (e.key.toLowerCase() == keyDown.key.toLocaleLowerCase()) keyDown.handler()
        })
    }, [downKeys])
    const keyupHandler = useCallback(e => {
        upKeys.forEach(keyUp => {
            if (e.key.toLowerCase() == keyUp.key.toLocaleLowerCase()) keyUp.handler()
        })
    }, [upKeys])

    useEffect ( () => {
        document.addEventListener('keydown', keydownHandler)
        document.addEventListener('keyup', keyupHandler)

        return () => {
            document.removeEventListener('keydown', keydownHandler)
            document.removeEventListener('keyup', keyupHandler)
        }
    }, [])

    return (
        <nav style={{ pointerEvents:'none', display:'flex', justifyContent:'space-between', position:'absolute', top:0, left:0, width:'100%' }}>
            {[leftButtons, rightButtons].map((buttons, i) => (
                <div style={{ pointerEvents:'auto' }} key={'topnavbuttons'+i}>
                    {buttons.map((btn,i) => (
                        <ButtonLabeled {...btn} isBox key={'topbuttonlabeled'+i}/>
                    ))}
                </div>
            ))}
        </nav>
    )
}

export default TopNav