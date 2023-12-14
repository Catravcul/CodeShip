import { useContext, useEffect, useState } from 'react';

import { UserInterfaceContext } from '../context';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';

const propsLabel = { title: '', placement: '' }
const propsButton = { content: '', bgColor: '', onClick: () => {}, onPointerDown: () => {}, onPointerUp: () => {} }

const ButtonLabeled = ({
    label = propsLabel,
    button:{ bgColor,
    content, ...buttonProps } = propsButton,
    isBox = false 
}) => {
    
    const { showLabels } = useContext(UserInterfaceContext)
    const [ isHovered, setIsHovered ] = useState(false)

    const [ tooltipProps, setTooltipProps ] = useState({})

    useEffect( () => {
        const props = {
            showLabels,
            onPointerOver: () => setIsHovered(true),
            onPointerLeave: () => setIsHovered(false)
        }
        setTooltipProps(props)
    }, [showLabels, isHovered] )

    return (
        <Tooltip {...label} {...tooltipProps} open={ showLabels || isHovered ? true : false} arrow PopperProps={{style:{zIndex:0}}}>
            <IconButton { ...buttonProps } aria-label={ content } >
                <Avatar sx={{ bgcolor:bgColor }} variant={isBox ? 'rounded' : 'circle'}>{ content }</Avatar>
            </IconButton>
        </Tooltip>
    )
}

export default ButtonLabeled