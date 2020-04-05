/**
 * @file Sturucture Component
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { Signal } from 'signals';
import { ComponentRegistry, MeasurementDefaultParams } from '../globals';
import { defaults, /*deepEqual, */ createRingBuffer, createSimpleDict } from '../utils';
import { smoothstep } from '../math/math-utils';
import Component, { ComponentDefaultParameters } from './component';
import RepresentationCollection from './representation-collection';
import TrajectoryElement from './trajectory-element';
import { makeTrajectory } from '../trajectory/trajectory-utils';
import Selection from '../selection/selection';
import StructureView from '../structure/structure-view';
import { superpose } from '../align/align-utils';
export const StructureComponentDefaultParameters = Object.assign({
    sele: '',
    defaultAssembly: ''
}, ComponentDefaultParameters);
/**
 * Component wrapping a {@link Structure} object
 *
 * @example
 * // get a structure component by loading a structure file into the stage
 * stage.loadFile( "rcsb://4opj" ).then( function( structureComponent ){
 *     structureComponent.addRepresentation( "cartoon" );
 *     structureComponent.autoView();
 * } );
 */
class StructureComponent extends Component {
    constructor(stage, structure, params = {}) {
        super(stage, structure, Object.assign({ name: structure.name }, params));
        this.structure = structure;
        this.trajList = [];
        this.signals = Object.assign(this.signals, {
            trajectoryAdded: new Signal(),
            trajectoryRemoved: new Signal(),
            defaultAssemblyChanged: new Signal()
        });
        this.initSelection(this.parameters.sele);
        //
        this.pickBuffer = createRingBuffer(4);
        this.pickDict = createSimpleDict();
        this.spacefillRepresentation = this.addRepresentation('spacefill', {
            sele: 'none',
            opacity: MeasurementDefaultParams.opacity,
            color: MeasurementDefaultParams.color,
            disablePicking: true,
            radiusType: 'data'
        }, true);
        this.distanceRepresentation = this.addRepresentation('distance', MeasurementDefaultParams, true);
        this.angleRepresentation = this.addRepresentation('angle', MeasurementDefaultParams, true);
        this.dihedralRepresentation = this.addRepresentation('dihedral', MeasurementDefaultParams, true);
        this.measureRepresentations = new RepresentationCollection([
            this.spacefillRepresentation,
            this.distanceRepresentation,
            this.angleRepresentation,
            this.dihedralRepresentation
        ]);
        //
        this.setDefaultAssembly(this.parameters.defaultAssembly);
    }
    get defaultParameters() { return StructureComponentDefaultParameters; }
    /**
     * Component type
     * @type {String}
     */
    get type() { return 'structure'; }
    /**
     * Initialize selection
     * @private
     * @param {String} sele - selection string
     * @return {undefined}
     */
    initSelection(sele) {
        /**
         * Selection for {@link StructureComponent#structureView}
         * @private
         * @type {Selection}
         */
        this.selection = new Selection(sele);
        /**
         * View on {@link StructureComponent#structure}.
         * Change its selection via {@link StructureComponent#setSelection}.
         * @type {StructureView}
         */
        this.structureView = new StructureView(this.structure, this.selection);
        this.selection.signals.stringChanged.add(() => {
            this.structureView.setSelection(this.selection);
            this.rebuildRepresentations();
            this.rebuildTrajectories();
        });
    }
    /**
     * Set selection of {@link StructureComponent#structureView}
     * @param {String} string - selection string
     * @return {StructureComponent} this object
     */
    setSelection(string) {
        this.parameters.sele = string;
        this.selection.setString(string);
        return this;
    }
    /**
     * Set the default assembly
     * @param {String} value - assembly name
     * @return {undefined}
     */
    setDefaultAssembly(value) {
        // filter out non-exsisting assemblies
        if (this.structure.biomolDict[value] === undefined)
            value = '';
        // only set default assembly when changed
        if (this.parameters.defaultAssembly !== value) {
            const reprParams = { defaultAssembly: value };
            this.reprList.forEach(repr => repr.setParameters(reprParams));
            this.measureRepresentations.setParameters(reprParams);
            this.parameters.defaultAssembly = value;
            this.signals.defaultAssemblyChanged.dispatch(value);
        }
        return this;
    }
    /**
     * Rebuild all representations
     * @return {undefined}
     */
    rebuildRepresentations() {
        this.reprList.forEach((repr) => {
            repr.build();
        });
        this.measureRepresentations.build();
    }
    /**
     * Rebuild all trajectories
     * @return {undefined}
     */
    rebuildTrajectories() {
        this.trajList.forEach(trajComp => {
            trajComp.trajectory.setStructure(this.structureView);
        });
    }
    updateRepresentations(what) {
        super.updateRepresentations(what);
        this.measureRepresentations.update(what);
    }
    addRepresentation(type, params = {}, hidden = false) {
        params.defaultAssembly = this.parameters.defaultAssembly;
        const reprComp = this._addRepresentation(type, this.structureView, params, hidden);
        if (!hidden) {
            reprComp.signals.parametersChanged.add(() => this.measureUpdate());
        }
        return reprComp;
    }
    /**
     * Add a new trajectory component to the structure
     */
    addTrajectory(trajPath = '', params = {}) {
        const traj = makeTrajectory(trajPath, this.structureView, params);
        traj.signals.frameChanged.add(() => {
            this.updateRepresentations({ 'position': true });
        });
        const trajComp = new TrajectoryElement(this.stage, traj, params);
        this.trajList.push(trajComp);
        this.signals.trajectoryAdded.dispatch(trajComp);
        return trajComp;
    }
    removeTrajectory(traj) {
        const idx = this.trajList.indexOf(traj);
        if (idx !== -1) {
            this.trajList.splice(idx, 1);
        }
        traj.dispose();
        this.signals.trajectoryRemoved.dispatch(traj);
    }
    dispose() {
        // copy via .slice because side effects may change trajList
        this.trajList.slice().forEach(traj => traj.dispose());
        this.trajList.length = 0;
        this.structure.dispose();
        this.measureRepresentations.dispose();
        super.dispose();
    }
    autoView(sele, duration) {
        if (typeof sele === 'number') {
            duration = sele;
            sele = '';
        }
        this.stage.animationControls.zoomMove(this.getCenter(sele), this.getZoom(sele), defaults(duration, 0));
    }
    getBoxUntransformed(sele) {
        let bb;
        if (sele) {
            bb = this.structureView.getBoundingBox(new Selection(sele));
        }
        else {
            bb = this.structureView.boundingBox;
        }
        return bb;
    }
    getCenterUntransformed(sele) {
        if (sele && typeof sele === 'string') {
            return this.structure.atomCenter(new Selection(sele));
        }
        else {
            return this.structure.center;
        }
    }
    superpose(component, align, sele1, sele2) {
        superpose(this.structureView, component.structureView, align, sele1, sele2);
        this.updateRepresentations({ 'position': true });
        return this;
    }
    getMaxRepresentationRadius(atomIndex) {
        let maxRadius = 0;
        const atom = this.structure.getAtomProxy(atomIndex);
        this.eachRepresentation(reprElem => {
            if (reprElem.getVisibility()) {
                const repr = reprElem.repr; // TODO
                maxRadius = Math.max(repr.getAtomRadius(atom), maxRadius);
            }
        });
        return maxRadius;
    }
    measurePick(atom) {
        const pickCount = this.pickBuffer.count;
        if (this.lastPick === atom.index && pickCount >= 1) {
            if (pickCount > 1) {
                const atomList = this.pickBuffer.data;
                const atomListSorted = this.pickBuffer.data.sort();
                if (this.pickDict.has(atomListSorted)) {
                    this.pickDict.del(atomListSorted);
                }
                else {
                    this.pickDict.add(atomListSorted, atomList);
                }
                if (pickCount === 2) {
                    this.distanceRepresentation.setParameters({
                        atomPair: this.pickDict.values.filter(l => l.length === 2)
                    });
                }
                else if (pickCount === 3) {
                    this.angleRepresentation.setParameters({
                        atomTriple: this.pickDict.values.filter(l => l.length === 3)
                    });
                }
                else if (pickCount === 4) {
                    this.dihedralRepresentation.setParameters({
                        atomQuad: this.pickDict.values.filter(l => l.length === 4)
                    });
                }
            }
            this.pickBuffer.clear();
            this.lastPick = undefined;
        }
        else {
            if (!this.pickBuffer.has(atom.index)) {
                this.pickBuffer.push(atom.index);
            }
            this.lastPick = atom.index;
        }
        this.measureUpdate();
    }
    measureClear() {
        this.pickBuffer.clear();
        this.lastPick = undefined;
        this.spacefillRepresentation.setSelection('none');
    }
    measureBuild() {
        const md = this.measureData();
        this.distanceRepresentation.setParameters({ atomPair: md.distance });
        this.angleRepresentation.setParameters({ atomTriple: md.angle });
        this.dihedralRepresentation.setParameters({ atomQuad: md.dihedral });
    }
    measureUpdate() {
        const pickData = this.pickBuffer.data;
        const radiusData = {};
        pickData.forEach(ai => {
            const r = Math.max(0.1, this.getMaxRepresentationRadius(ai));
            radiusData[ai] = r * (2.3 - smoothstep(0.1, 2, r));
        });
        this.spacefillRepresentation.setSelection(pickData.length ? ('@' + pickData.join(',')) : 'none');
        this.spacefillRepresentation.setParameters({ radiusData });
    }
    measureData() {
        const pv = this.pickDict.values;
        return {
            distance: pv.filter(l => l.length === 2),
            angle: pv.filter(l => l.length === 3),
            dihedral: pv.filter(l => l.length === 4)
        };
    }
    /**
     * Remove all measurements, optionally limit to distance, angle or dihedral
     */
    removeAllMeasurements(type) {
        const pd = this.pickDict;
        const pv = pd.values;
        const remove = function (len) {
            pv.filter(l => l.length === len).forEach(l => pd.del(l.slice().sort()));
        };
        if (!type || type & 1 /* Distance */)
            remove(2);
        if (!type || type & 2 /* Angle */)
            remove(3);
        if (!type || type & 4 /* Dihedral */)
            remove(4);
        this.measureBuild();
    }
    /**
     * Remove a measurement given as a pair, triple, quad of atom indices
     */
    removeMeasurement(atomList) {
        this.pickDict.del(atomList.slice().sort());
        this.measureBuild();
    }
    /**
     * Add a measurement given as a pair, triple, quad of atom indices
     */
    addMeasurement(atomList) {
        if (atomList.length < 2 || atomList.length > 4)
            return;
        const atomListSorted = atomList.slice().sort();
        if (!this.pickDict.has(atomListSorted)) {
            this.pickDict.add(atomListSorted, atomList);
        }
        this.measureBuild();
    }
}
ComponentRegistry.add('structure', StructureComponent);
ComponentRegistry.add('structureview', StructureComponent);
export default StructureComponent;
