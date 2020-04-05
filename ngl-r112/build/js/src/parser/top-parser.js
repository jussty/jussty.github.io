/**
 * @file Top Parser
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { Debug, Log, ParserRegistry } from '../globals';
import StructureParser from './structure-parser';
import { WaterNames } from '../structure/structure-constants';
import { assignResidueTypeBonds, calculateBondsBetween, calculateBondsWithin, getChainname } from '../structure/structure-utils';
const reField = /\[ (.+) \]/;
const reWhitespace = /\s+/;
class TopParser extends StructureParser {
    get type() { return 'top'; }
    _parse() {
        // http://manual.gromacs.org/online/top.html
        if (Debug)
            Log.time('TopParser._parse ' + this.name);
        const s = this.structure;
        const sb = this.structureBuilder;
        //
        const atomMap = s.atomMap;
        const bondStore = s.bondStore;
        const atomStore = s.atomStore;
        atomStore.addField('partialCharge', 1, 'float32');
        const molecules = [];
        const moleculetypeDict = {};
        let currentMoleculetype;
        let mode;
        function _parseChunkOfLines(_i, _n, lines) {
            for (let i = _i; i < _n; ++i) {
                const line = lines[i];
                let lt = line.trim();
                if (!lt || lt[0] === '*' || lt[0] === ';') {
                    continue;
                }
                if (lt.startsWith('#include')) {
                    throw new Error('TopParser: #include statements not allowed');
                }
                const fieldMatch = line.match(reField);
                if (fieldMatch !== null) {
                    const name = fieldMatch[1];
                    if (name === 'moleculetype') {
                        mode = 2 /* Moleculetype */;
                        currentMoleculetype = {
                            atoms: [],
                            bonds: []
                        };
                    }
                    else if (name === 'atoms') {
                        mode = 3 /* Atoms */;
                    }
                    else if (name === 'bonds') {
                        mode = 4 /* Bonds */;
                    }
                    else if (name === 'system') {
                        mode = 0 /* System */;
                    }
                    else if (name === 'molecules') {
                        mode = 1 /* Molecules */;
                    }
                    else {
                        mode = undefined;
                    }
                    continue;
                }
                const cIdx = lt.indexOf(';');
                if (cIdx !== -1) {
                    lt = lt.substring(0, cIdx).trim();
                }
                if (mode === 2 /* Moleculetype */) {
                    const molName = lt.split(reWhitespace)[0];
                    moleculetypeDict[molName] = currentMoleculetype;
                }
                else if (mode === 3 /* Atoms */) {
                    const ls = lt.split(reWhitespace);
                    currentMoleculetype.atoms.push([
                        parseInt(ls[2]),
                        ls[3],
                        ls[4],
                        parseFloat(ls[6]) // charge
                    ]);
                }
                else if (mode === 4 /* Bonds */) {
                    const ls = lt.split(reWhitespace);
                    currentMoleculetype.bonds.push([
                        parseInt(ls[0]),
                        parseInt(ls[1]) // aj
                    ]);
                }
                else if (mode === 0 /* System */) {
                    s.title = lt;
                }
                else if (mode === 1 /* Molecules */) {
                    const ls = lt.split(reWhitespace);
                    molecules.push([
                        ls[0],
                        parseInt(ls[1]) // count
                    ]);
                }
            }
        }
        this.streamer.eachChunkOfLines(function (lines /*, chunkNo, chunkCount */) {
            _parseChunkOfLines(0, lines.length, lines);
        });
        let atomCount = 0;
        let bondCount = 0;
        molecules.forEach(function (val) {
            const [name, molCount] = val;
            const molType = moleculetypeDict[name];
            atomCount += molCount * molType.atoms.length;
            bondCount += molCount * molType.bonds.length;
        });
        atomStore.resize(atomCount);
        bondStore.resize(bondCount);
        let atomIdx = 0;
        let resIdx = 0;
        let chainidIdx = 0;
        let chainnameIdx = 0;
        let bondIdx = 0;
        let atomOffset = 0;
        let lastResno;
        molecules.forEach(function (val) {
            const [name, molCount] = val;
            const molType = moleculetypeDict[name];
            const chainname = getChainname(chainnameIdx);
            for (let i = 0; i < molCount; ++i) {
                lastResno = -1;
                const chainid = WaterNames.includes(name) ? chainname : getChainname(chainidIdx);
                molType.atoms.forEach(function (atomData) {
                    const [resno, resname, atomname, charge] = atomData;
                    if (resno !== lastResno) {
                        ++resIdx;
                    }
                    atomStore.atomTypeId[atomIdx] = atomMap.add(atomname);
                    atomStore.serial[atomIdx] = atomIdx + 1;
                    atomStore.partialCharge[atomIdx] = charge;
                    sb.addAtom(0, chainname, chainid, resname, resIdx + 1);
                    ++atomIdx;
                    lastResno = resno;
                });
                molType.bonds.forEach(function (bondData) {
                    bondStore.atomIndex1[bondIdx] = atomOffset + bondData[0] - 1;
                    bondStore.atomIndex2[bondIdx] = atomOffset + bondData[1] - 1;
                    ++bondIdx;
                });
                ++chainidIdx;
                atomOffset += molType.atoms.length;
            }
            ++chainnameIdx;
        });
        bondStore.count = bondCount;
        sb.finalize();
        s.finalizeAtoms();
        s.finalizeBonds();
        calculateBondsWithin(s, true);
        calculateBondsBetween(s, true, true);
        assignResidueTypeBonds(s);
        if (Debug)
            Log.timeEnd('TopParser._parse ' + this.name);
    }
}
ParserRegistry.add('top', TopParser);
export default TopParser;
