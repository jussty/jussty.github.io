/**
 * @file Halogen Bonds
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author Fred Ludlow <Fred.Ludlow@astx.com>
 */
import { defaults } from '../../utils';
import { degToRad } from '../../math/math-utils';
import { addAtom, addFeature, createFeatureState, } from './features';
import { ContactDefaultParams, invalidAtomContact } from './contact';
import { calcAngles } from '../geometry';
const halBondElements = [17, 35, 53, 85];
/**
 * Halogen bond donors (X-C, with X one of Cl, Br, I or At) not F!
 */
export function addHalogenDonors(structure, features) {
    structure.eachAtom(a => {
        if (halBondElements.includes(a.number) && a.bondToElementCount(6 /* C */) === 1) {
            const state = createFeatureState(6 /* HalogenDonor */);
            addAtom(state, a);
            addFeature(features, state);
        }
    });
}
const X = [7 /* N */, 8 /* O */, 16 /* S */];
const Y = [6 /* C */, 7 /* N */, 15 /* P */, 16 /* S */];
/**
 * Halogen bond acceptors (Y-{O|N|S}, with Y=C,P,N,S)
 */
export function addHalogenAcceptors(structure, features) {
    structure.eachAtom(a => {
        if (X.includes(a.number)) {
            let flag = false;
            a.eachBondedAtom(ba => {
                if (Y.includes(ba.number)) {
                    flag = true;
                }
            });
            if (flag) {
                const state = createFeatureState(7 /* HalogenAcceptor */);
                addAtom(state, a);
                addFeature(features, state);
            }
        }
    });
}
function isHalogenBond(ti, tj) {
    return ((ti === 7 /* HalogenAcceptor */ && tj === 6 /* HalogenDonor */) ||
        (ti === 6 /* HalogenDonor */ && tj === 7 /* HalogenAcceptor */));
}
// http://www.pnas.org/content/101/48/16789.full
const OptimalHalogenAngle = degToRad(180); // adjusted from 165 to account for spherical statistics
const OptimalAcceptorAngle = degToRad(120);
/**
 * All pairs of halogen donor and acceptor atoms
 */
export function addHalogenBonds(structure, contacts, params = {}) {
    const maxHalogenBondDist = defaults(params.maxHalogenBondDist, ContactDefaultParams.maxHalogenBondDist);
    const maxHalogenBondAngle = degToRad(defaults(params.maxHalogenBondAngle, ContactDefaultParams.maxHalogenBondAngle));
    const masterIdx = defaults(params.masterModelIndex, ContactDefaultParams.masterModelIndex);
    const { features, spatialHash, contactStore, featureSet } = contacts;
    const { types, centers, atomSets } = features;
    const { x, y, z } = centers;
    const n = types.length;
    const ap1 = structure.getAtomProxy();
    const ap2 = structure.getAtomProxy();
    for (let i = 0; i < n; ++i) {
        spatialHash.eachWithin(x[i], y[i], z[i], maxHalogenBondDist, (j, dSq) => {
            if (j <= i)
                return;
            ap1.index = atomSets[i][0];
            ap2.index = atomSets[j][0];
            if (invalidAtomContact(ap1, ap2, masterIdx))
                return;
            if (!isHalogenBond(types[i], types[j]))
                return;
            const [halogen, acceptor] = types[i] === 6 /* HalogenDonor */ ? [ap1, ap2] : [ap2, ap1];
            const halogenAngles = calcAngles(halogen, acceptor);
            // Singly bonded halogen only (not bromide ion for example)
            if (halogenAngles.length !== 1)
                return;
            if (OptimalHalogenAngle - halogenAngles[0] > maxHalogenBondAngle)
                return;
            const acceptorAngles = calcAngles(acceptor, halogen);
            // Angle must be defined. Excludes water as acceptor. Debatable
            if (acceptorAngles.length === 0)
                return;
            if (acceptorAngles.some(acceptorAngle => {
                return (OptimalAcceptorAngle - acceptorAngle > maxHalogenBondAngle);
            }))
                return;
            featureSet.setBits(i, j);
            contactStore.addContact(i, j, 5 /* HalogenBond */);
        });
    }
}
