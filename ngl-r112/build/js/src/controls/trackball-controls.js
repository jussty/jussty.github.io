/**
 * @file Trackball Controls
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { Vector3, Matrix4, Quaternion } from 'three';
import { defaults } from '../utils';
const tmpRotateXMatrix = new Matrix4();
const tmpRotateYMatrix = new Matrix4();
const tmpRotateZMatrix = new Matrix4();
const tmpRotateMatrix = new Matrix4();
const tmpRotateVector = new Vector3();
const tmpRotateQuaternion = new Quaternion();
const tmpPanMatrix = new Matrix4();
const tmpPanVector = new Vector3();
const tmpAtomVector = new Vector3();
/**
 * Trackball controls
 */
class TrackballControls {
    constructor(stage, params = {}) {
        this.stage = stage;
        this.rotateSpeed = defaults(params.rotateSpeed, 2.0);
        this.zoomSpeed = defaults(params.zoomSpeed, 1.2);
        this.panSpeed = defaults(params.panSpeed, 1.0);
        this.viewer = stage.viewer;
        this.mouse = stage.mouseObserver;
        this.controls = stage.viewerControls;
    }
    get component() {
        return this.stage.transformComponent;
    }
    get atom() {
        return this.stage.transformAtom;
    }
    _setPanVector(x, y, z = 0) {
        const scaleFactor = this.controls.getCanvasScaleFactor(z);
        tmpPanVector.set(x, y, 0);
        tmpPanVector.multiplyScalar(this.panSpeed * scaleFactor);
    }
    _getRotateXY(x, y) {
        return [
            this.rotateSpeed * -x * 0.01,
            this.rotateSpeed * y * 0.01
        ];
    }
    _transformPanVector() {
        if (!this.component)
            return;
        tmpPanMatrix.extractRotation(this.component.transform);
        tmpPanMatrix.premultiply(this.viewer.rotationGroup.matrix);
        tmpPanMatrix.getInverse(tmpPanMatrix);
        tmpPanVector.applyMatrix4(tmpPanMatrix);
    }
    zoom(delta) {
        this.controls.zoom(this.zoomSpeed * delta * 0.02);
    }
    pan(x, y) {
        this._setPanVector(x, y);
        tmpPanMatrix.getInverse(this.viewer.rotationGroup.matrix);
        tmpPanVector.applyMatrix4(tmpPanMatrix);
        this.controls.translate(tmpPanVector);
    }
    panComponent(x, y) {
        if (!this.component)
            return;
        this._setPanVector(x, y);
        this._transformPanVector();
        this.component.position.add(tmpPanVector);
        this.component.updateMatrix();
    }
    panAtom(x, y) {
        if (!this.atom || !this.component)
            return;
        this.atom.positionToVector3(tmpAtomVector);
        tmpAtomVector.add(this.viewer.translationGroup.position);
        tmpAtomVector.applyMatrix4(this.viewer.rotationGroup.matrix);
        this._setPanVector(x, y, tmpAtomVector.z);
        this._transformPanVector();
        this.atom.positionAdd(tmpPanVector);
        this.component.updateRepresentations({ 'position': true });
    }
    rotate(x, y) {
        const [dx, dy] = this._getRotateXY(x, y);
        tmpRotateXMatrix.makeRotationX(dy);
        tmpRotateYMatrix.makeRotationY(dx);
        tmpRotateXMatrix.multiply(tmpRotateYMatrix);
        this.controls.applyMatrix(tmpRotateXMatrix);
    }
    zRotate(x, y) {
        const dz = this.rotateSpeed * ((-x + y) / -2) * 0.01;
        tmpRotateZMatrix.makeRotationZ(dz);
        this.controls.applyMatrix(tmpRotateZMatrix);
    }
    rotateComponent(x, y) {
        if (!this.component)
            return;
        const [dx, dy] = this._getRotateXY(x, y);
        tmpRotateMatrix.extractRotation(this.component.transform);
        tmpRotateMatrix.premultiply(this.viewer.rotationGroup.matrix);
        tmpRotateMatrix.getInverse(tmpRotateMatrix);
        tmpRotateVector.set(1, 0, 0);
        tmpRotateVector.applyMatrix4(tmpRotateMatrix);
        tmpRotateXMatrix.makeRotationAxis(tmpRotateVector, dy);
        tmpRotateVector.set(0, 1, 0);
        tmpRotateVector.applyMatrix4(tmpRotateMatrix);
        tmpRotateYMatrix.makeRotationAxis(tmpRotateVector, dx);
        tmpRotateXMatrix.multiply(tmpRotateYMatrix);
        tmpRotateQuaternion.setFromRotationMatrix(tmpRotateXMatrix);
        this.component.quaternion.premultiply(tmpRotateQuaternion);
        this.component.updateMatrix();
    }
}
export default TrackballControls;
