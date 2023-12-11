import {getBlueCode, getOrangeredCode, getWhiteboneCode, getLightblueCode, getCyanCode} from '../codeSpans'


export const quest = {
    codeObjs: [
        {
            code: [
                getBlueCode('let'), getLightblueCode('A001IsOn'), '=', getBlueCode("true")
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('P003IsOn'), '=', getBlueCode("false")
            ]
        }, {
            code: [
                getBlueCode('let'), getLightblueCode('A002IsOn'), '=', getBlueCode("true")
            ]
        }
    ],
    title: 'Configure nano_net',
    name: 'Nevaeh',
    img: '/img/nevaeh/face_100px.webp',
    lines: [
        'Dear Doménica,',
        `Some modules of the nano_net switch their operation state due to an anormality on the energy inputs, they may be switched again
        manually by entering the correct value, again the ship is going to help you to enter the correct values.`,
        `the value for this task is called 'boolean' and there are only two options (true) and (false), they aren't text, e.g.`,
        <code>{getBlueCode('let')} {getLightblueCode('scienceExists')} = {getBlueCode('true')}</code>,
        `P.S. Let me inform you that someone was behind the communications failure, although I suspect you knew that. I want to remind you
        that we can support you, let me know if you need anything from us.`,
        `P.S. Take care`
    ]
}