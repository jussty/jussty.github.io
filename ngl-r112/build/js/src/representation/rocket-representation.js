/**
 * @file Rocket Representation
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { RepresentationRegistry } from '../globals';
import { defaults } from '../utils';
import { AtomPicker } from '../utils/picker.js';
import StructureRepresentation from './structure-representation.js';
import Helixbundle from '../geometry/helixbundle.js';
import CylinderBuffer from '../buffer/cylinder-buffer.js';
/**
 * Rocket Representation
 */
class RocketRepresentation extends StructureRepresentation {
    // protected helixbundleList: Helixbundle[]
    constructor(structure, viewer, params) {
        super(structure, viewer, params);
        this.type = 'rocket';
        this.parameters = Object.assign({
            localAngle: {
                type: 'integer', max: 180, min: 0, rebuild: true
            },
            centerDist: {
                type: 'number', precision: 1, max: 10, min: 0, rebuild: true
            },
            ssBorder: {
                type: 'boolean', rebuild: true
            },
            radialSegments: true,
            openEnded: true,
            disableImpostor: true
        }, this.parameters);
        // this.helixbundleList = []
        this.init(params);
    }
    init(params) {
        let p = params || {};
        p.colorScheme = defaults(p.colorScheme, 'sstruc');
        p.radiusSize = defaults(p.radiusSize, 1.5);
        p.radiusScale = defaults(p.radiusScale, 1.0);
        p.openEnded = defaults(p.openEnded, false);
        p.useInteriorColor = defaults(p.useInteriorColor, true);
        this.localAngle = defaults(p.localAngle, 30);
        this.centerDist = defaults(p.centerDist, 2.5);
        this.ssBorder = defaults(p.ssBorder, false);
        super.init(p);
    }
    createData(sview) {
        let length = 0;
        const axisList = [];
        const helixbundleList = [];
        this.structure.eachPolymer(polymer => {
            if (polymer.residueCount < 4 || polymer.isNucleic())
                return;
            const helixbundle = new Helixbundle(polymer);
            const axis = helixbundle.getAxis(this.localAngle, this.centerDist, this.ssBorder, this.getColorParams(), this.getRadiusParams());
            length += axis.size.length;
            axisList.push(axis);
            helixbundleList.push(helixbundle);
        }, sview.getSelection());
        const axisData = {
            begin: new Float32Array(length * 3),
            end: new Float32Array(length * 3),
            size: new Float32Array(length),
            color: new Float32Array(length * 3),
            picking: {}
        };
        let picking = new Float32Array(length);
        let offset = 0;
        axisList.forEach(function (axis) {
            axisData.begin.set(axis.begin, offset * 3);
            axisData.end.set(axis.end, offset * 3);
            axisData.size.set(axis.size, offset);
            axisData.color.set(axis.color, offset * 3);
            picking.set(axis.picking.array, offset);
            offset += axis.size.length;
        });
        if (length) {
            axisData.picking = new AtomPicker(picking, sview.getStructure());
        }
        const cylinderBuffer = new CylinderBuffer({
            position1: axisData.begin,
            position2: axisData.end,
            color: axisData.color,
            color2: axisData.color,
            radius: axisData.size,
            picking: axisData.picking
        }, this.getBufferParams({
            openEnded: this.openEnded,
            radialSegments: this.radialSegments,
            disableImpostor: this.disableImpostor,
            dullInterior: true
        }));
        return {
            bufferList: [cylinderBuffer],
            axisList: axisList,
            helixbundleList: helixbundleList,
            axisData: axisData
        };
    }
    updateData(what, data) {
        what = what || {};
        if (what.position) {
            this.build();
            return;
        }
        var cylinderData = {};
        if (what.color || what.radius) {
            var offset = 0;
            data.helixbundleList.forEach((helixbundle) => {
                var axis = helixbundle.getAxis(this.localAngle, this.centerDist, this.ssBorder, this.getColorParams(), this.getRadiusParams());
                if (what.color) {
                    data.axisData.color.set(axis.color, offset * 3);
                }
                if (what.radius || what.scale) {
                    data.axisData.size.set(axis.size, offset);
                }
                offset += axis.size.length;
            });
            if (what.color) {
                Object.assign(cylinderData, {
                    color: data.axisData.color,
                    color2: data.axisData.color
                });
            }
            if (what.radius || what.scale) {
                Object.assign(cylinderData, {
                    radius: data.axisData.size
                });
            }
        }
        data.bufferList[0].setAttributes(cylinderData);
    }
}
RepresentationRegistry.add('rocket', RocketRepresentation);
export default RocketRepresentation;
