import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';

import { Config } from '../Game/Config'
import './carrousel.css'
import { SessionContext } from './sessionContext'

import triangle_l from './triangle_l.png'
import triangle_r from './triangle_r.png'

export class Carrousel extends Config {
    state = {
        position: 0,
    }
    classes = ['sm', 'md', 'lg', 'md', 'sm']
    items
    products

    getProducts = (ids, products) => {
        const components = []
        const { position } = this.state
        if (ids.length > 5) {
            if (position + 5 > ids.length) {
                const initialIds = ids.slice(position, ids.length)
                ids = initialIds.concat(ids.slice(0, 5 - initialIds.length))
            } else {
                ids = ids.slice(position, position + 5)
            }
        }
        ids.forEach(id => {
            const index = products.findIndex(product => product._id == id)
            if(index > -1){
                components.push(products[index])
            }
        })
        return components
    }

    nextItems = () => {
        this.setState({position: this.state.position == this.items.length - 1 ? 0 : this.state.position + 1})
    }

    prevItems = () => {
        this.setState({position: this.state.position == 0 ? this.items.length - 2 : this.state.position - 1})
    }

    printNav = (img, handler) => {
        return this.items.length > 5 ? 
            <button onClick={handler} className="btn nav img" style={{backgroundImage: 'url("' + img + '")'}} ></button>
            : ''
    }

    getCarrousel = () => (
        <>
        {this.printNav(triangle_l, this.prevItems)}

        {this.getProducts(this.items, this.products).map((item, index) => 
        <button className={"btn " + this.classes[index]} onClick={() => this.props.selectComponent(item)} >
            <div className="fix-height">
                <img className="img" style={{backgroundImage: 'url("' + Config.config.codeshipFS.urlBase + item.img_path + '")'}} />
            </div>
        </button>
        )}

        {this.printNav(triangle_r, this.nextItems)}
        </>
    )

    getCarrouselSkeleton = () => (
        <>
        {[1, 2, 3, 4, 5].map((item, index) => 
        <button className={"btn " + this.classes[index]} >
            <div className="fix-height" >
                <Skeleton className="img" variant="rectangular" sx={{ position:"absolute", top: "0", left: '0', width: '100%', height: '100%', bgcolor: 'grey.900' }}/>
            </div>
        </button>
        )}
        <Alert severity="info" sx={{ mt: 2 }}>There isn't any item for customization yet.</Alert>
        </>
    )

    render() {
        this.items = this.context.session ? this.context.session.items : undefined
        this.products = this.context.products


        return ( 
            <>
                <section className="carrousel-s absolute">
                    { (this.items && this.products) ? this.getCarrousel() : this.getCarrouselSkeleton() }
                </section>
            </>
        )
    }
}

Carrousel.contextType = SessionContext