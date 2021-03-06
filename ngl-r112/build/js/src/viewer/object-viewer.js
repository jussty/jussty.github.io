/**
 * @file Viewer
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { Box3, Group, Matrix4, Vector3, } from 'three';
import { Log, RepresentationRegistry, setExtensionFragDepth, setSupportsReadPixelsFloat, SupportsReadPixelsFloat } from '../globals';
import { sortProjectedPosition, updateMaterialUniforms, } from './viewer-utils';
import Selection from "../selection/selection";
import Surface from "../surface/surface";
import Structure from "../structure/structure";
import Volume from "../surface/volume";
import { autoLoad } from "../loader/loader-utils";
const tmpMatrix = new Matrix4();
function onBeforeRender(renderer, scene, camera, geometry, material /*, group */) {
    const u = material.uniforms;
    const updateList = [];
    if (u.objectId) {
        u.objectId.value = SupportsReadPixelsFloat ? this.id : this.id / 255;
        updateList.push('objectId');
    }
    if (u.modelViewMatrixInverse || u.modelViewMatrixInverseTranspose ||
        u.modelViewProjectionMatrix || u.modelViewProjectionMatrixInverse) {
        this.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, this.matrixWorld);
    }
    if (u.modelViewMatrixInverse) {
        u.modelViewMatrixInverse.value.getInverse(this.modelViewMatrix);
        updateList.push('modelViewMatrixInverse');
    }
    if (u.modelViewMatrixInverseTranspose) {
        if (u.modelViewMatrixInverse) {
            u.modelViewMatrixInverseTranspose.value.copy(u.modelViewMatrixInverse.value).transpose();
        }
        else {
            u.modelViewMatrixInverseTranspose.value
                .getInverse(this.modelViewMatrix)
                .transpose();
        }
        updateList.push('modelViewMatrixInverseTranspose');
    }
    if (u.modelViewProjectionMatrix) {
        u.modelViewProjectionMatrix.value.multiplyMatrices(camera.projectionMatrix, this.modelViewMatrix);
        updateList.push('modelViewProjectionMatrix');
    }
    if (u.modelViewProjectionMatrixInverse) {
        if (u.modelViewProjectionMatrix) {
            tmpMatrix.copy(u.modelViewProjectionMatrix.value);
            u.modelViewProjectionMatrixInverse.value.getInverse(tmpMatrix);
        }
        else {
            tmpMatrix.multiplyMatrices(camera.projectionMatrix, this.modelViewMatrix);
            u.modelViewProjectionMatrixInverse.value.getInverse(tmpMatrix);
        }
        updateList.push('modelViewProjectionMatrixInverse');
    }
    if (updateList.length) {
        const materialProperties = renderer.properties.get(material);
        if (materialProperties.program) {
            const gl = renderer.getContext();
            const p = materialProperties.program;
            gl.useProgram(p.program);
            const pu = p.getUniforms();
            updateList.forEach(function (name) {
                pu.setValue(gl, name, u[name].value);
            });
        }
    }
}
/**
 * Viewer class
 * @class
 * @param {String|Element} [idOrElement] - dom id or element
 */
export default class ThreeJSViewer {
    constructor(renderer, camera, scene, group) {
        this.boundingBox = new Box3();
        this.boundingBoxSize = new Vector3();
        this.boundingBoxLength = 0;
        this.distVector = new Vector3();
        this.camera = camera;
        this.scene = scene;
        if (!group) {
            group = new Group();
            scene.add(group);
        }
        this.modelGroup = group;
        this.renderer = renderer;
        setExtensionFragDepth(true);
        setSupportsReadPixelsFloat(true);
    }
    addRepresentation(data, type, params) {
        if (!type || type === 'default') {
            return defaultFileRepresentation(data, this);
        }
        else {
            const representation = RepresentationRegistry.get(type);
            if (!representation) {
                Log.error('Unknown representation:' + type);
                return;
            }
            return new representation(data, this, params);
        }
    }
    static new(renderer, camera, scene, data, type, params) {
        const viewer = new ThreeJSViewer(renderer, camera, scene);
        viewer.addRepresentation(data, type, params);
        return viewer;
    }
    static load(renderer, camera, scene, file, type, params) {
        return new Promise((resolve => {
            autoLoad(file).then((data) => {
                const viewer = new ThreeJSViewer(renderer, camera, scene);
                viewer.addRepresentation(data, type, params);
                resolve(viewer);
            });
        }));
    }
    add(buffer, instanceList) {
        // Log.time( "Viewer.add" );
        if (instanceList) {
            instanceList.forEach(instance => this.addBuffer(buffer, instance));
        }
        else {
            this.addBuffer(buffer);
        }
        //if (buffer.parameters.background) { // todo may be needed for SurfaceRepresentation?
        //  this.backgroundGroup.add(buffer.group)
        //  this.backgroundGroup.add(buffer.wireframeGroup)
        //} else {
        this.modelGroup.add(buffer.group);
        this.modelGroup.add(buffer.wireframeGroup);
        //}
    }
    addBuffer(buffer, instance) {
        // Log.time( "Viewer.addBuffer" );
        function setUserData(object) {
            if (object instanceof Group) {
                object.children.forEach(setUserData);
            }
            else {
                object.userData.buffer = buffer;
                object.userData.instance = instance;
                object.onBeforeRender = onBeforeRender;
            }
        }
        const mesh = buffer.getMesh();
        if (instance) {
            mesh.applyMatrix(instance.matrix);
        }
        setUserData(mesh);
        buffer.group.add(mesh);
        if (instance) {
            this._updateBoundingBox(buffer.geometry, buffer.matrix, instance.matrix);
        }
        else {
            this._updateBoundingBox(buffer.geometry, buffer.matrix);
        }
        // Log.timeEnd( "Viewer.addBuffer" );
    }
    remove(buffer) {
        this.modelGroup.children.forEach(function (group) {
            group.remove(buffer.group); // todo ?!
        });
        this.updateBoundingBox();
    }
    _updateBoundingBox(geometry, matrix, instanceMatrix) {
        const boundingBox = this.boundingBox;
        function updateGeometry(geometry, matrix, instanceMatrix) {
            if (!geometry.boundingBox) {
                geometry.computeBoundingBox();
            }
            const geoBoundingBox = geometry.boundingBox.clone();
            if (matrix) {
                geoBoundingBox.applyMatrix4(matrix);
            }
            if (instanceMatrix) {
                geoBoundingBox.applyMatrix4(instanceMatrix);
            }
            if (geoBoundingBox.min.equals(geoBoundingBox.max)) {
                // mainly to give a single impostor geometry some volume
                // as it is only expanded in the shader on the GPU
                geoBoundingBox.expandByScalar(5);
            }
            boundingBox.union(geoBoundingBox);
        }
        function updateNode(node) {
            if (node.geometry !== undefined) {
                let matrix, instanceMatrix;
                if (node.userData.buffer) {
                    matrix = node.userData.buffer.matrix;
                }
                if (node.userData.instance) {
                    instanceMatrix = node.userData.instance.matrix;
                }
                updateGeometry(node.geometry, matrix, instanceMatrix); // TODO
            }
        }
        if (geometry) {
            updateGeometry(geometry, matrix, instanceMatrix);
        }
        else {
            boundingBox.makeEmpty();
            this.modelGroup.traverse(updateNode);
        }
        boundingBox.getSize(this.boundingBoxSize);
        this.boundingBoxLength = this.boundingBoxSize.length();
    }
    updateBoundingBox() {
        this._updateBoundingBox();
    }
    requestRender() {
        this.render();
    }
    /**
     * Convert an absolute clip value to a relative one using bRadius.
     *
     * 0.0 -> 50.0
     * bRadius -> 0.0
     */
    absoluteToRelative(d) {
        return 50 * (1 - d / this.bRadius);
    }
    /**
     * Convert a relative clip value to an absolute one using bRadius
     *
     * 0.0 -> bRadius
     * 50.0 -> 0.0
     */
    relativeToAbsolute(d) {
        return this.bRadius * (1 - d / 50);
    }
    /**
     * Intepret clipMode, clipScale and set the camera and fog clipping.
     * Also ensures bRadius and cDist are valid
     */
    __updateClipping() {
        // bRadius must always be updated for material-based clipping
        // and for focus calculations
        this.bRadius = Math.max(10, this.boundingBoxLength * 0.5);
        // FL: Removed below, but leaving commented as I don't understand intention
        // this.bRadius += this.boundingBox.getCenter(this.distVector).length()
        if (!isFinite(this.bRadius)) {
            this.bRadius = 50;
        }
        this.cDist = this.distVector.copy(this.camera.position).length();
        /*if (!this.cDist) { // TODO
          //const p = this.parameters
          // recover from a broken (NaN) camera position
          this.camera.position.set(0, 0, p.cameraZ)
          this.cDist = Math.abs(p.cameraZ)
        }*/
    }
    __updateCamera() {
        const camera = this.camera;
        camera.updateMatrix();
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        updateMaterialUniforms(this.scene, camera, this.renderer, this.cDist, this.bRadius);
        sortProjectedPosition(this.scene, camera);
    }
    render() {
        this.__updateClipping();
        this.__updateCamera();
        // render
        this.renderer.render(this.scene, this.camera);
    }
    clear() {
        this.renderer.clear();
    }
    dispose() {
        this.renderer.dispose();
    }
}
function defaultFileRepresentation(data, viewer) {
    if (data instanceof Structure) {
        let atomCount, residueCount, instanceCount;
        const structure = data;
        if (structure.biomolDict.BU1) {
            const assembly = structure.biomolDict.BU1;
            atomCount = assembly.getAtomCount(structure);
            residueCount = assembly.getResidueCount(structure);
            instanceCount = assembly.getInstanceCount();
        }
        else {
            atomCount = structure.getModelProxy(0).atomCount;
            residueCount = structure.getModelProxy(0).residueCount;
            instanceCount = 1;
        }
        let sizeScore = atomCount;
        const backboneOnly = structure.atomStore.count / structure.residueStore.count < 2;
        if (backboneOnly) {
            sizeScore *= 10;
        }
        let colorScheme = 'chainname';
        let colorScale = 'RdYlBu';
        let colorReverse = false;
        if (structure.getChainnameCount(new Selection('polymer and /0')) === 1) {
            colorScheme = 'residueindex';
            colorScale = 'spectral';
            colorReverse = true;
        }
        if (residueCount / instanceCount < 4) {
            return new (RepresentationRegistry.get('ball+stick'))(structure, viewer, {
                colorScheme: 'element',
                radiusScale: 2.0,
                aspectRatio: 1.5,
                bondScale: 0.3,
                bondSpacing: 0.75,
                quality: 'auto'
            });
        }
        else if ((instanceCount > 5 && sizeScore > 15000) || sizeScore > 700000) {
            let scaleFactor = (Math.min(1.5, Math.max(0.1, 2000 / (sizeScore / instanceCount))));
            if (backboneOnly)
                scaleFactor = Math.min(scaleFactor, 0.15);
            return new (RepresentationRegistry.get('surface'))(structure, viewer, {
                colorScheme, colorScale, colorReverse,
                sele: 'polymer',
                surfaceType: 'sas',
                probeRadius: 1.4,
                scaleFactor: scaleFactor,
                useWorker: false
            });
        }
        else if (sizeScore > 250000) {
            return new (RepresentationRegistry.get('backbone'))(structure, viewer, {
                colorScheme, colorScale, colorReverse,
                lineOnly: true
            });
        }
        else if (sizeScore > 100000) {
            return new (RepresentationRegistry.get('backbone'))(structure, viewer, {
                colorScheme, colorScale, colorReverse,
                quality: 'low',
                disableImpostor: true,
                radiusScale: 2.0
            });
        }
        else if (sizeScore > 80000) {
            return new (RepresentationRegistry.get('backbone'))(structure, viewer, {
                colorScheme, colorScale, colorReverse,
                radiusScale: 2.0
            });
        }
        else {
            return new (RepresentationRegistry.get('cartoon'))(structure, viewer, {
                colorScheme, colorScale, colorReverse,
                radiusScale: 0.7,
                aspectRatio: 5,
                quality: 'auto'
            });
            /*if (sizeScore < 50000) {
                return new (RepresentationRegistry.get('base'))(structure, viewer, {
                    colorScheme, colorScale, colorReverse,
                    quality: 'auto'
                })
            }
            return new (RepresentationRegistry.get('ball+stick'))(structure, viewer, {
                sele: 'ligand',
                colorScheme: 'element',
                radiusScale: 2.0,
                aspectRatio: 1.5,
                bondScale: 0.3,
                bondSpacing: 0.75,
                quality: 'auto'
            })*/
        }
        // add frames as trajectory
        //if (structure.frames.length) {
        //    component.addTrajectory()
        //}
    }
    else if (data instanceof Surface) {
        return new (RepresentationRegistry.get('surface'))(data, viewer);
    }
    else if (data instanceof Volume) {
        return new (RepresentationRegistry.get('surface'))(data, viewer);
    }
}
