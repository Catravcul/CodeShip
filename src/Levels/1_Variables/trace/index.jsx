import GameLoop from "../../../Game/loop";

import { memo, useRef, useEffect } from "react";

import { Config } from "../../../Game/Config";
import Obj3D from "./obj3D";

/**
 * it doesn't return any Element, it serves for the rendering of the trace, which changes color and position by the parent props, it also changes the visibility of the parent modal
 */
const Trace = memo(({ pIsModalActive, pToggleIsCodePos, pCodeObjIdx, pQuestIdx }) => {
    const isModalActiveRef = useRef(pIsModalActive)
    
    const obj3D = useRef(new Obj3D())

    useEffect(() => {
        Config.scene.add( obj3D.current.trace );

        const actionId = GameLoop.addAction(() => {
            obj3D.current.update()
            if ( obj3D.current.isTraceFollowerInOriginArea() ) {
                if (!isModalActiveRef.current) pToggleIsCodePos()
            } else {
                if (isModalActiveRef.current) pToggleIsCodePos()
            }
        })

        return () => {
            GameLoop.removeAction(actionId)
            Config.scene.remove( obj3D.current.trace )
        }
    }, [])

    useEffect(() => {isModalActiveRef.current = pIsModalActive}, [pIsModalActive])

    useEffect(() => {
        obj3D.current.changeColor().changeOrigin()
    }, [pCodeObjIdx, pQuestIdx])

    return (<></>)
})

export default Trace