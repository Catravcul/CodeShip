import { memo, useContext } from 'react'

import Slide from '@mui/material/Slide'
import Backdrop from '@mui/material/Backdrop'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'

import { LevelsContext } from './context'
import './notification.css'


export const Notification = memo(() => {
    
    const { quest, showQuest, toggleShowQuest } = useContext(LevelsContext)
    
    return (
        <Backdrop
        open={showQuest}
        sx={{ color: '#fff', zIndex: 1 }}
        onClick={toggleShowQuest}
        >
            <Slide in={showQuest} direction='right' unmountOnExit onClick={e => e.stopPropagation()}>
                <Card sx={{ overflow: 'auto', maxWidth: '94vw', width: 400, maxHeight: '90vh' }}>
                    <CardHeader
                        avatar={
                        <Avatar sx={{ bgcolor: 'error.light' }} aria-label="recipe">
                            <img src={quest.img} alt={quest.name + ' avatar'} width="100%" height="auto"/>
                        </Avatar>
                        }
                        action={
                        <IconButton aria-label="close modal" onClick={toggleShowQuest}>
                            &times;
                        </IconButton>
                        }
                        title={quest.title}
                        subheader={quest.name}
                    />
                    <CardContent>
                        {
                            quest.lines.map((line, i) => (
                                <Typography style={{marginBottom:'10px'}} variant="body2" color="text.secondary" key={"text-line-"+i}>{line}</Typography>
                            ))
                        }
                    </CardContent>
                </Card>
            </Slide>
        </Backdrop>
    )
})