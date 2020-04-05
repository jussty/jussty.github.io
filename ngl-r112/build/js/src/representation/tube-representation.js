/**
 * @file Tube Representation
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { RepresentationRegistry } from '../globals';
import { defaults } from '../utils';
import CartoonRepresentation from './cartoon-representation.js';
/**
 * Tube Representation
 */
class TubeRepresentation extends CartoonRepresentation {
    constructor(structure, viewer, params) {
        super(structure, viewer, params);
        this.type = 'tube';
        this.parameters = Object.assign({}, this.parameters, { aspectRatio: null });
    }
    init(params) {
        var p = params || {};
        p.aspectRatio = 1.0;
        p.radiusScale = defaults(p.radiusScale, 2.0);
        if (p.quality === 'low') {
            this.radialSegments = 5;
        }
        super.init(p);
    }
    getSplineParams( /* params */) {
        return super.getSplineParams({
            directional: false
        });
    }
}
RepresentationRegistry.add('tube', TubeRepresentation);
export default TubeRepresentation;
