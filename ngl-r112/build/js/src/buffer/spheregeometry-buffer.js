/**
 * @file Sphere Geometry Buffer
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { IcosahedronBufferGeometry, Vector3, BufferGeometry } from 'three';
import { defaults } from '../utils';
import GeometryBuffer from './geometry-buffer';
import { BufferDefaultParameters } from './buffer';
const scale = new Vector3();
export const SphereGeometryBufferDefaultParameters = Object.assign({
    sphereDetail: 1
}, BufferDefaultParameters);
/**
 * Sphere geometry buffer.
 *
 * @example
 * var sphereGeometryBuffer = new SphereGeometryBuffer({
 *   position: new Float32Array([ 0, 0, 0 ]),
 *   color: new Float32Array([ 1, 0, 0 ]),
 *   radius: new Float32Array([ 1 ])
 * });
 */
class SphereGeometryBuffer extends GeometryBuffer {
    /**
     * @param {Object} data - attribute object
     * @param {Float32Array} data.position - positions
     * @param {Float32Array} data.color - colors
     * @param {Float32Array} data.radius - radii
     * @param {Picker} [data.picking] - picking ids
     * @param {BufferParameters} params - parameter object
     */
    constructor(data, params = {}) {
        super(data, params, new IcosahedronBufferGeometry(1, defaults(params.sphereDetail, 1)));
        this.setAttributes(data, true);
    }
    get defaultParameters() { return SphereGeometryBufferDefaultParameters; }
    applyPositionTransform(matrix, i) {
        const r = this._radius[i];
        scale.set(r, r, r);
        matrix.scale(scale);
    }
    setAttributes(data = {}, initNormals) {
        if (data.radius)
            this._radius = data.radius;
        super.setAttributes(data, initNormals);
    }
}
export default SphereGeometryBuffer;
