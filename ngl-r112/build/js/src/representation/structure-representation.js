/**
 * @file Structure Representation
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { ExtensionFragDepth, Mobile } from '../globals';
import { defaults } from '../utils';
import { default as Representation } from './representation.js';
import Selection from '../selection/selection.js';
import RadiusFactory, { RadiusFactoryTypes } from '../utils/radius-factory.js';
/**
 * Structure representation
 * @interface
 */
class StructureRepresentation extends Representation {
    /**
     * Create Structure representation object
     * @param {Structure} structure - the structure to be represented
     * @param {Viewer} viewer - a viewer object
     * @param {StructureRepresentationParameters} params - structure representation parameters
     */
    constructor(structure, viewer, params) {
        const p = params || {};
        super(structure, viewer, p);
        this.type = 'structure';
        this.parameters = Object.assign({
            radiusType: {
                type: 'select', options: RadiusFactory.types
            },
            radiusData: {
                type: 'hidden'
            },
            radiusSize: {
                type: 'number', precision: 3, max: 10.0, min: 0.001
            },
            radiusScale: {
                type: 'number', precision: 3, max: 10.0, min: 0.001
            },
            assembly: null,
            defaultAssembly: {
                type: 'hidden'
            }
        }, this.parameters);
        /**
         * @type {Selection}
         * @private
         */
        this.selection = new Selection(p.sele);
        /**
         * @type {Array}
         * @private
         */
        this.dataList = [];
        /**
         * @type {Structure}
         */
        this.structure = structure;
        /**
         * @type {StructureView}
         */
        this.structureView = this.structure.getView(this.selection);
        if (structure.biomolDict) {
            const biomolOptions = {
                'default': 'default',
                '': (structure.unitcell ? 'AU' : 'FULL')
            };
            Object.keys(structure.biomolDict).forEach(function (k) {
                biomolOptions[k] = k;
            });
            this.parameters.assembly = {
                type: 'select',
                options: biomolOptions,
                rebuild: true
            };
        }
        else {
            this.parameters.assembly = null;
        }
    }
    get defaultScale() {
        return {
            'vdw': 1.0,
            'covalent': 1.0,
            'bfactor': 0.01,
            'sstruc': 1.0
        };
    }
    init(params) {
        const p = params || {};
        p.colorScheme = defaults(p.colorScheme, 'element');
        this.setRadius(p.radius, p);
        this.radiusType = defaults(p.radiusType, 'vdw');
        this.radiusData = defaults(p.radiusData, {});
        this.radiusSize = defaults(p.radiusSize, 1.0);
        this.radiusScale = defaults(p.radiusScale, 1.0);
        this.assembly = defaults(p.assembly, 'default');
        this.defaultAssembly = defaults(p.defaultAssembly, '');
        if (p.quality === 'auto') {
            p.quality = this.getQuality();
        }
        super.init(p);
        this.selection.signals.stringChanged.add(( /* sele */) => {
            this.build();
        });
        this.build();
    }
    setRadius(value, p) {
        const types = Object.keys(RadiusFactoryTypes);
        if (typeof value === 'string' && types.includes(value.toLowerCase())) {
            p.radiusType = value;
        }
        else if (value !== undefined) {
            p.radiusType = 'size';
            p.radiusSize = value;
        }
        return this;
    }
    getAssembly() {
        const name = this.assembly === 'default' ? this.defaultAssembly : this.assembly;
        return this.structure.biomolDict[name];
    }
    getQuality() {
        let atomCount;
        const s = this.structureView;
        const assembly = this.getAssembly();
        if (assembly) {
            atomCount = assembly.getAtomCount(s);
        }
        else {
            atomCount = s.atomCount;
        }
        if (Mobile) {
            atomCount *= 4;
        }
        const backboneOnly = s.atomStore.count / s.residueStore.count < 2;
        if (backboneOnly) {
            atomCount *= 10;
        }
        if (atomCount < 15000) {
            return 'high';
        }
        else if (atomCount < 80000) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    create() {
        if (this.structureView.atomCount === 0)
            return;
        if (!this.structureView.hasCoords()) {
            this.needsBuild = true;
            return;
        }
        else {
            this.needsBuild = false;
        }
        const assembly = this.getAssembly();
        if (assembly) {
            assembly.partList.forEach((part, i) => {
                const sview = part.getView(this.structureView);
                if (sview.atomCount === 0)
                    return;
                const data = this.createData(sview, i);
                if (data) {
                    data.sview = sview;
                    data.instanceList = part.getInstanceList();
                    this.dataList.push(data);
                }
            });
        }
        else {
            const data = this.createData(this.structureView, 0);
            if (data) {
                data.sview = this.structureView;
                this.dataList.push(data);
            }
        }
    }
    update(what) {
        if (this.lazy && !this.visible) {
            Object.assign(this.lazyProps.what, what);
            return;
        }
        if (this.needsBuild) {
            this.build();
            return;
        }
        this.dataList.forEach((data) => {
            if (data.bufferList.length > 0) {
                this.updateData(what, data);
            }
        }, this);
    }
    updateData(what, data) {
        this.build();
    }
    getColorParams() {
        return Object.assign(Object.assign({}, super.getColorParams()), { structure: this.structure });
    }
    getRadiusParams(param) {
        return {
            type: this.radiusType,
            scale: this.radiusScale,
            size: this.radiusSize,
            data: this.radiusData
        };
    }
    getAtomParams(what, params) {
        return Object.assign({
            what: what,
            colorParams: this.getColorParams(),
            radiusParams: this.getRadiusParams()
        }, params);
    }
    getBondParams(what, params) {
        return Object.assign({
            what: what,
            colorParams: this.getColorParams(),
            radiusParams: this.getRadiusParams()
        }, params);
    }
    getAtomRadius(atom) {
        if (this.structureView.atomSet.isSet(atom.index)) {
            const radiusFactory = new RadiusFactory(this.getRadiusParams());
            return radiusFactory.atomRadius(atom);
        }
        return 0;
    }
    /**
     * Set representation parameters
     * @alias StructureRepresentation#setSelection
     * @param {String} string - selection string, see {@tutorial selection-language}
     * @param {Boolean} [silent] - don't trigger a change event in the selection
     * @return {StructureRepresentation} this object
     */
    setSelection(string, silent) {
        this.selection.setString(string, silent);
        return this;
    }
    /**
     * Set representation parameters
     * @alias StructureRepresentation#setParameters
     * @param {StructureRepresentationParameters} params - structure parameter object
     * @param {Object} [what] - buffer data attributes to be updated,
     *                        note that this needs to be implemented in the
     *                        derived classes. Generally it allows more
     *                        fine-grained control over updating than
     *                        forcing a rebuild.
     * @param {Boolean} what.position - update position data
     * @param {Boolean} what.color - update color data
     * @param {Boolean} [rebuild] - whether or not to rebuild the representation
     * @return {StructureRepresentation} this object
     */
    setParameters(params, what = {}, rebuild = false) {
        const p = params || {};
        this.setRadius(p.radius, p);
        if (p.radiusType !== undefined || p.radiusData !== undefined || p.radiusSize !== undefined || p.radiusScale !== undefined) {
            what.radius = true;
            if (!ExtensionFragDepth || this.disableImpostor) {
                rebuild = true;
            }
        }
        if (p.defaultAssembly !== undefined &&
            p.defaultAssembly !== this.defaultAssembly &&
            ((this.assembly === 'default' && p.assembly === undefined) ||
                p.assembly === 'default')) {
            rebuild = true;
        }
        super.setParameters(p, what, rebuild);
        return this;
    }
    getParameters() {
        const params = Object.assign(super.getParameters(), {
            sele: this.selection ? this.selection.string : undefined,
            defaultAssembly: this.defaultAssembly
        });
        return params;
    }
    attach(callback) {
        const viewer = this.viewer;
        const bufferList = this.bufferList;
        this.dataList.forEach(function (data) {
            data.bufferList.forEach(function (buffer) {
                bufferList.push(buffer);
                viewer.add(buffer, data.instanceList);
            });
        });
        this.setVisibility(this.visible);
        callback();
    }
    clear() {
        this.dataList.length = 0;
        super.clear();
    }
    dispose() {
        this.structureView.dispose();
        delete this.structure;
        delete this.structureView;
        super.dispose();
    }
}
export default StructureRepresentation;
