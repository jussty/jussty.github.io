/**
 * @file Structure Parser
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { defaults } from '../utils';
import Parser from './parser';
import Structure from '../structure/structure';
import StructureBuilder from '../structure/structure-builder';
class StructureParser extends Parser {
    constructor(streamer, params) {
        var p = params || {};
        super(streamer, p);
        this.firstModelOnly = defaults(p.firstModelOnly, false);
        this.asTrajectory = defaults(p.asTrajectory, false);
        this.cAlphaOnly = defaults(p.cAlphaOnly, false);
        this.structure = new Structure(this.name, this.path);
        this.structureBuilder = new StructureBuilder(this.structure);
    }
    get type() { return 'structure'; }
    get __objName() { return 'structure'; }
}
export default StructureParser;
