import { useContext } from "react"
import { LevelsContext } from "./context"


const Plan = () => {
    const context = useContext(LevelsContext)
    
    return <context.questView />
}

export default Plan