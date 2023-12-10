import {getBlueCode, getOrangeredCode, getWhiteboneCode, getLightblueCode, getCyanCode} from '../codeSpans'


export const quest = {
    codeObjs: [
        {
            code: [
                getBlueCode('let'), getLightblueCode('globalCode'), '=', getOrangeredCode("'3396815'")
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('waveCode'), '=', getOrangeredCode("'8819618'")
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('pulseCode'), '=', getOrangeredCode("'441319'")
            ]
        }
    ],
    title: 'Configure nano_net',
    name: 'Nevaeh',
    img: '/img/nevaeh/face_100px.webp',
    lines: [
        'Dear Doménica,',
        `We are sorry that you had experience a bad communication service, our experts are now investigating the source of it.`,
        `The values you entered into the nano_net aren't working as we expected, probably we are missing codes, to solve this you would
        have to enter text values to the nano_net, it is like what you did with the numbers.`,
        `the only difference between entering numbers and entering text is that the text must have an especific simbol at the beggining 
        and end, one of these symbols is the single quote ('), e.g.`,
        getBlueCode('let'), getLightblueCode('name'), '=', getOrangeredCode("'Nevaeh'"),
        `I'm so happy that you have such a caring dear ones!`
    ]
}