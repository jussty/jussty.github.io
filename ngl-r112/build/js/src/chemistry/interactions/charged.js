/**
 * @file Charged
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author Fred Ludlow <Fred.Ludlow@astx.com>
 */
import { Vector3 } from 'three';
import { defaults } from '../../utils';
import { radToDeg } from '../../math/math-utils';
import { AA3, Bases } from '../../structure/structure-constants';
import { valenceModel } from '../../structure/data';
import { isGuanidine, isAcetamidine, isSulfonicAcid, isPhosphate, isSulfate, isCarboxylate } from '../functional-groups';
import { addAtom, addFeature, createFeatureState, } from './features';
import { ContactDefaultParams, invalidAtomContact } from './contact';
const PositvelyCharged = ['ARG', 'HIS', 'LYS'];
const NegativelyCharged = ['GLU', 'ASP'];
export function addPositiveCharges(structure, features) {
    const { charge } = valenceModel(structure.data);
    const atomInGroupDict = {};
    structure.eachResidue(r => {
        if (PositvelyCharged.includes(r.resname)) {
            const state = createFeatureState(1 /* PositiveCharge */);
            r.eachAtom(a => {
                if (a.number === 7 /* N */ && a.isSidechain()) {
                    addAtom(state, a);
                }
            });
            addFeature(features, state);
        }
        else if (!AA3.includes(r.resname) && !r.isNucleic()) {
            r.eachAtom(a => {
                let addGroup = false;
                const state = createFeatureState(1 /* PositiveCharge */);
                if (isGuanidine(a)) {
                    state.group = 8 /* Guanidine */;
                    addGroup = true;
                }
                else if (isAcetamidine(a)) {
                    state.group = 9 /* Acetamidine */;
                    addGroup = true;
                }
                if (addGroup) {
                    a.eachBondedAtom(a => {
                        if (a.number === 7 /* N */) {
                            atomInGroupDict[a.index] = true;
                            addAtom(state, a);
                        }
                    });
                    addFeature(features, state);
                }
            });
            r.eachAtom(a => {
                const state = createFeatureState(1 /* PositiveCharge */);
                if (charge[a.index] > 0) {
                    if (!atomInGroupDict[a.index]) {
                        addAtom(state, a);
                        addFeature(features, state);
                    }
                }
            });
        }
    });
}
export function addNegativeCharges(structure, features) {
    const { charge } = valenceModel(structure.data);
    const atomInGroupDict = {};
    structure.eachResidue(r => {
        if (NegativelyCharged.includes(r.resname)) {
            const state = createFeatureState(2 /* NegativeCharge */);
            r.eachAtom(a => {
                if (a.number === 8 /* O */ && a.isSidechain()) {
                    addAtom(state, a);
                }
            });
            addFeature(features, state);
        }
        else if (Bases.includes(r.resname)) {
            const state = createFeatureState(2 /* NegativeCharge */);
            r.eachAtom(a => {
                if (isPhosphate(a)) {
                    state.group = 6 /* Phosphate */;
                    a.eachBondedAtom(a => {
                        if (a.number === 8 /* O */)
                            addAtom(state, a);
                    });
                    addFeature(features, state);
                }
            });
        }
        else if (!AA3.includes(r.resname) && !Bases.includes(r.resname)) {
            r.eachAtom(a => {
                let addGroup = false;
                const state = createFeatureState(2 /* NegativeCharge */);
                if (isSulfonicAcid(a)) {
                    state.group = 4 /* SulfonicAcid */;
                    addGroup = true;
                }
                else if (isPhosphate(a)) {
                    state.group = 6 /* Phosphate */;
                    addGroup = true;
                }
                else if (isSulfate(a)) {
                    state.group = 5 /* Sulfate */;
                    addGroup = true;
                }
                else if (isCarboxylate(a)) {
                    state.group = 10 /* Carboxylate */;
                    addGroup = true;
                }
                if (addGroup) {
                    a.eachBondedAtom(a => {
                        if (a.number === 8 /* O */) {
                            atomInGroupDict[a.index] = true;
                            addAtom(state, a);
                        }
                    });
                    addFeature(features, state);
                }
            });
            r.eachAtom(a => {
                const state = createFeatureState(2 /* NegativeCharge */);
                if (charge[a.index] < 0) {
                    if (!atomInGroupDict[a.index]) {
                        addAtom(state, a);
                        addFeature(features, state);
                    }
                }
            });
        }
    });
}
export function addAromaticRings(structure, features) {
    const a = structure.getAtomProxy();
    structure.eachResidue(r => {
        const rings = r.getAromaticRings();
        if (rings) {
            const offset = r.atomOffset;
            rings.forEach(ring => {
                const state = createFeatureState(3 /* AromaticRing */);
                ring.forEach(i => {
                    a.index = i + offset;
                    addAtom(state, a);
                });
                addFeature(features, state);
            });
        }
    });
}
function isIonicInteraction(ti, tj) {
    return ((ti === 2 /* NegativeCharge */ && tj === 1 /* PositiveCharge */) ||
        (ti === 1 /* PositiveCharge */ && tj === 2 /* NegativeCharge */));
}
function isPiStacking(ti, tj) {
    return ti === 3 /* AromaticRing */ && tj === 3 /* AromaticRing */;
}
function isCationPi(ti, tj) {
    return ((ti === 3 /* AromaticRing */ && tj === 1 /* PositiveCharge */) ||
        (ti === 1 /* PositiveCharge */ && tj === 3 /* AromaticRing */));
}
export function addChargedContacts(structure, contacts, params = {}) {
    const maxIonicDist = defaults(params.maxIonicDist, ContactDefaultParams.maxIonicDist);
    const maxPiStackingDist = defaults(params.maxPiStackingDist, ContactDefaultParams.maxPiStackingDist);
    const maxPiStackingOffset = defaults(params.maxPiStackingOffset, ContactDefaultParams.maxPiStackingOffset);
    const maxPiStackingAngle = defaults(params.maxPiStackingAngle, ContactDefaultParams.maxPiStackingAngle);
    const maxCationPiDist = defaults(params.maxCationPiDist, ContactDefaultParams.maxCationPiDist);
    const maxCationPiOffset = defaults(params.maxCationPiOffset, ContactDefaultParams.maxCationPiOffset);
    const masterIdx = defaults(params.masterModelIndex, ContactDefaultParams.masterModelIndex);
    const maxDistance = Math.max(maxIonicDist + 2, maxPiStackingDist, maxCationPiDist);
    // const maxSaltBridgeDistSq = maxSaltBridgeDist * maxSaltBridgeDist
    const maxPiStackingDistSq = maxPiStackingDist * maxPiStackingDist;
    const maxCationPiDistSq = maxCationPiDist * maxCationPiDist;
    const { features, spatialHash, contactStore, featureSet } = contacts;
    const { types, centers, atomSets } = features;
    const { x, y, z } = centers;
    const n = types.length;
    const ax = structure.atomStore.x;
    const ay = structure.atomStore.y;
    const az = structure.atomStore.z;
    const ap1 = structure.getAtomProxy();
    const ap2 = structure.getAtomProxy();
    const areAtomSetsWithinDist = function (atomSet1, atomSet2, maxDist) {
        const sn = atomSet1.length;
        const sm = atomSet2.length;
        for (let si = 0; si < sn; ++si) {
            ap1.index = atomSet1[si];
            for (let sj = 0; sj < sm; ++sj) {
                ap2.index = atomSet2[sj];
                if (ap1.distanceTo(ap2) <= maxDist) {
                    return true;
                }
            }
        }
        return false;
    };
    const v1 = new Vector3();
    const v2 = new Vector3();
    const v3 = new Vector3();
    const d1 = new Vector3();
    const d2 = new Vector3();
    const n1 = new Vector3();
    const n2 = new Vector3();
    const getNormal = function (atoms, normal) {
        v1.set(ax[atoms[0]], ay[atoms[0]], az[atoms[0]]);
        v2.set(ax[atoms[1]], ay[atoms[1]], az[atoms[1]]);
        v3.set(ax[atoms[2]], ay[atoms[2]], az[atoms[2]]);
        d1.subVectors(v1, v2);
        d2.subVectors(v1, v3);
        normal.crossVectors(d1, d2);
    };
    const getOffset = function (i, j, normal) {
        v1.set(x[i], y[i], z[i]);
        v2.set(x[j], y[j], z[j]);
        return v1.sub(v2).projectOnPlane(normal).add(v2).distanceTo(v2);
    };
    const add = function (i, j, ct) {
        featureSet.setBits(i, j);
        contactStore.addContact(i, j, ct);
    };
    for (let i = 0; i < n; ++i) {
        spatialHash.eachWithin(x[i], y[i], z[i], maxDistance, (j, dSq) => {
            if (j <= i)
                return;
            ap1.index = atomSets[i][0];
            ap2.index = atomSets[j][0];
            if (invalidAtomContact(ap1, ap2, masterIdx))
                return;
            const ti = types[i];
            const tj = types[j];
            if (isIonicInteraction(ti, tj)) {
                if (areAtomSetsWithinDist(atomSets[i], atomSets[j], maxIonicDist)) {
                    add(i, j, 1 /* IonicInteraction */);
                }
            }
            else if (isPiStacking(ti, tj)) {
                if (dSq <= maxPiStackingDistSq) {
                    getNormal(atomSets[i], n1);
                    getNormal(atomSets[j], n2);
                    const angle = radToDeg(n1.angleTo(n2));
                    const offset = Math.min(getOffset(i, j, n2), getOffset(j, i, n1));
                    if (offset <= maxPiStackingOffset) {
                        if (angle <= maxPiStackingAngle || angle >= 180 - maxPiStackingAngle) {
                            add(i, j, 3 /* PiStacking */); // parallel
                        }
                        else if (angle <= maxPiStackingAngle + 90 && angle >= 90 - maxPiStackingAngle) {
                            add(i, j, 3 /* PiStacking */); // t-shaped
                        }
                    }
                }
            }
            else if (isCationPi(ti, tj)) {
                if (dSq <= maxCationPiDistSq) {
                    const [l, k] = ti === 3 /* AromaticRing */ ? [i, j] : [j, i];
                    getNormal(atomSets[l], n1);
                    const offset = getOffset(k, l, n1);
                    if (offset <= maxCationPiOffset) {
                        add(l, k, 2 /* CationPi */);
                    }
                }
            }
        });
    }
}
