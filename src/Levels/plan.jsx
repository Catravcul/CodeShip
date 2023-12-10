import { useContext } from "react"
import { LevelsContext } from "./context"


const Plan = (props = {handleClose:()=>{}, showModal:false}) => {
    const context = useContext(LevelsContext)
    
    return <context.questView {...props} />
}

export default Plan