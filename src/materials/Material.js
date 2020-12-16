import { MeshPhongMaterial } from 'three'

export class Material {
    MeshPhongMaterial = new MeshPhongMaterial({
        transparent : true,
        emissive : 0x565656,
        specular : 0x565656,
        shininess : 75
    })
    material
}