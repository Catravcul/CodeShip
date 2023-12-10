import { createContext } from "react";

export const initialValue = {
    questView: <div></div>,
    quest: { title:'', name:'', img:'', lines:[''] },
    codeView: <div></div>,
    showCode: false,
    toggleShowCode: () => {}
}
export const LevelsContext = createContext(initialValue)