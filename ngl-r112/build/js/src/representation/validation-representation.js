/**
 * @file Validation Representation
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { RepresentationRegistry } from '../globals';
import { defaults } from '../utils';
import StructureRepresentation from './structure-representation.js';
import CylinderBuffer from '../buffer/cylinder-buffer.js';
/**
 * Validation representation
 */
class ValidationRepresentation extends StructureRepresentation {
    constructor(structure, viewer, params) {
        super(structure, viewer, params);
        this.type = 'validation';
        this.parameters = Object.assign({}, this.parameters, {
            radiusType: null,
            radiusSize: null,
            radiusScale: null
        });
        this.init(params);
    }
    init(params) {
        const p = params || {};
        p.colorValue = defaults(p.colorValue, '#f0027f');
        p.useInteriorColor = defaults(p.useInteriorColor, true);
        super.init(p);
    }
    createData(sview) {
        if (!sview.validation)
            return;
        const clashData = sview.validation.getClashData({
            structure: sview,
            color: this.colorValue
        });
        const cylinderBuffer = new CylinderBuffer(clashData, this.getBufferParams({ openEnded: false }));
        return {
            bufferList: [cylinderBuffer]
        };
    }
}
RepresentationRegistry.add('validation', ValidationRepresentation);
export default ValidationRepresentation;
