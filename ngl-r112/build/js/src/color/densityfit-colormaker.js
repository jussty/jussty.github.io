/**
 * @file Densityfit Colormaker
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { ColormakerRegistry } from '../globals';
import Colormaker from './colormaker';
/**
 * Color by validation density fit
 */
class DensityfitColormaker extends Colormaker {
    constructor(params) {
        super(params);
        this.rsrzDict = {};
        this.rsccDict = {};
        if (!params.scale) {
            this.parameters.scale = 'RdYlBu';
        }
        this.rsrzScale = this.getScale({ domain: [2, 0] });
        this.rsccScale = this.getScale({ domain: [0.678, 1.0] });
        const val = params.structure.validation;
        if (val) {
            this.rsrzDict = val.rsrzDict;
            this.rsccDict = val.rsccDict;
        }
    }
    atomColor(atom) {
        let sele = atom.resno + '';
        if (atom.inscode)
            sele += '^' + atom.inscode;
        if (atom.chainname)
            sele += ':' + atom.chainname;
        sele += '/' + atom.modelIndex;
        const rsrz = this.rsrzDict[sele];
        if (rsrz !== undefined) {
            return this.rsrzScale(rsrz);
        }
        const rscc = this.rsccDict[sele];
        if (rscc !== undefined) {
            return this.rsccScale(rscc);
        }
        return 0x909090;
    }
}
ColormakerRegistry.add('densityfit', DensityfitColormaker);
export default DensityfitColormaker;
