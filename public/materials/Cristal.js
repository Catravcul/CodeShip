import { Material } from './Material.js'

export class Cristal extends Material {
    constructor() {
        super()
        this.material = this.MeshPhongMaterial.clone()
        this.material.opacity = 0.3
    }
}