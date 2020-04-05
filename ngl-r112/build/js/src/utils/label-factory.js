/**
 * @file Label Factory
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { AA1 } from '../structure/structure-constants';
import { sprintf } from 'sprintf-js';
export const LabelFactoryTypes = {
    '': '',
    'atomname': 'atom name',
    'atomindex': 'atom index',
    'occupancy': 'occupancy',
    'bfactor': 'b-factor',
    'serial': 'serial',
    'element': 'element',
    'atom': 'atom name + index',
    'resname': 'residue name',
    'resno': 'residue no',
    'res': 'one letter code + no',
    'residue': '[residue name] + no + inscode',
    'text': 'text',
    'format': 'format',
    'qualified': 'qualified name'
};
class LabelFactory {
    constructor(type, text = {}, format = '') {
        this.type = type;
        this.text = text;
        this.format = format;
    }
    atomLabel(a) {
        const type = this.type;
        let l;
        switch (type) {
            case 'atomname':
                l = a.atomname;
                break;
            case 'atomindex':
                l = `${a.index}`;
                break;
            case 'occupancy':
                l = a.occupancy.toFixed(2);
                break;
            case 'bfactor':
                l = a.bfactor.toFixed(2);
                break;
            case 'serial':
                l = `${a.serial}`;
                break;
            case 'element':
                l = a.element;
                break;
            case 'atom':
                l = `${a.atomname}|${a.index}`;
                break;
            case 'resname':
                l = a.resname;
                break;
            case 'resno':
                l = `${a.resno}`;
                break;
            case 'res':
                l = `${(AA1[a.resname.toUpperCase()] || a.resname)}${a.resno}`;
                break;
            case 'residue':
                const aa1 = AA1[a.resname.toUpperCase()];
                if (aa1 && !a.inscode) {
                    l = `${aa1}${a.resno}`;
                }
                else {
                    l = `[${a.resname}]${a.resno}${a.inscode}`;
                }
                break;
            case 'text':
                l = this.text[a.index];
                break;
            case 'format':
                l = sprintf(this.format, a);
                break;
            // case "qualified":
            default:
                l = a.qualifiedName();
                break;
        }
        return l === undefined ? '' : l;
    }
}
LabelFactory.types = LabelFactoryTypes;
export default LabelFactory;
