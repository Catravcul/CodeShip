import { useContext } from 'react';

import { UserInterfaceContext } from '../context';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';

const propsLabel = { title: '', placement: '' }
const propsButton = { content: '', bgColor: '', onClick: () => {}, onPointerDown: () => {}, onPointerUp: () => {} }

const ButtonLabeled = ({ label = propsLabel, button = propsButton, isBox = false }) => {
    
    const { buttonsLabeled: { open } } = useContext(UserInterfaceContext)
    if (open) label.open = true
    const { bgColor, content, ...buttonProps } = button
    const variant = isBox ? 'rounded' : 'circle'

    return (
        <Tooltip {...label} arrow PopperProps={{style:{zIndex:0}}}>
            <IconButton { ...buttonProps } aria-label={ content } >
                <Avatar sx={{ bgcolor: bgColor }} variant={variant}>{ content }</Avatar>
            </IconButton>
        </Tooltip>
    )
}

export default ButtonLabeled