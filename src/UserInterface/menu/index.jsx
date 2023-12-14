import { memo, useContext } from 'react'

import Slide from '@mui/material/Slide'
import Backdrop from '@mui/material/Backdrop'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Switch from '@mui/material/Switch'

import { UserInterfaceContext } from '../context'

import upgrades from './upgrades'


export const Menu = memo(( {showMenu = false, toggleShowMenu = () => {}} ) => {
    
    const { showLabels, toggleShowLabels } = useContext(UserInterfaceContext)
    
    return (
        <Backdrop
        open={ showMenu }
        sx={{ zIndex: 1, width: '100vw', height: '100vh', overflowX: 'hidden', overflowY: 'scroll', color: '#fff' }}
        onClick={toggleShowMenu}
        >
            <Slide in={ showMenu } direction='left' unmountOnExit onClick={e => e.stopPropagation()}>
                <Card sx={{ overflow: 'auto', maxWidth: '94vw', width: 400, maxHeight: '90vh' }}>

                    <CardHeader
                        avatar={
                        <Avatar sx={{ bgcolor: 'error.light' }} aria-label="domenica">
                            <img src="/img/dome/face_100px.webp" alt='domenica' width="100%" height="auto"/>
                        </Avatar>
                        }
                        action={
                            <>
                            <Tooltip title="switch labels" arrow placement="bottom-start" open={showLabels}>
                                <Switch checked={showLabels} onChange={toggleShowLabels} inputProps={{ 'aria-label': 'toggle labels visibility' }} />
                            </Tooltip>
                            <IconButton aria-label="close modal" onClick={toggleShowMenu}>
                                &times;
                            </IconButton>
                            </>
                        }
                        title="Menu"
                        subheader="Doménica"
                    />

                    <CardContent>

                        <Upgrades/>

                    </CardContent>

                </Card>
            </Slide>
        </Backdrop>
    )
})


const Upgrades = () => {
    return (
        <>
        {upgrades.map( ({ title, description, img: { src, alt, source }, qualities }) => (

        <Card variant="outlined" style={{marginBottom:'60px'}} key={'upgrade card ' + title}>

            <CardHeader title={title} />

            <CardContent>

                <Typography style={{marginBottom:'10px'}} variant="body2" color="text.secondary">
                    { description }
                </Typography>

                <img src={src} alt={alt} width='100%' height='auto'/>
                <Typography style={{marginBottom:'10px'}} variant="body2" color="text.secondary"> 
                    { source }
                </Typography>
                
                { qualities.map( ({ title, description }) => (

                <Accordion TransitionProps={{ unmountOnExit: true }} key={'upgrade accordion ' + title}>
                    <AccordionSummary
                    expandIcon={<span style={{transform:'rotate(90deg)'}}>&#10097;</span>}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                    >
                    <Typography>{ title }</Typography>
                    </AccordionSummary>

                    <AccordionDetails>
                        <Typography style={{marginBottom:'10px'}} variant="body2" color="text.secondary"> { description }</Typography>
                        <Button color='warning' variant="outlined" >Invest</Button>
                    </AccordionDetails>


                </Accordion>

                ) ) }

            </CardContent>

        </Card>

        ) )}
        </>
    )
}