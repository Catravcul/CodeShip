import { createContext } from "react";

export const initialValue = {
    questView: <div></div>,
    quest: { title:'', name:'', img:'', lines:[''] },
    codeView: <div></div>,
    showQuest: false,
    toggleShowQuest () {},
    showCode: false,
    toggleShowCode () {},
    isCodePos: false,
    toggleIsCodePos () {}
}
export const LevelsContext = createContext(initialValue)