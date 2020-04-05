/**
 * @file Frames Trajectory
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { defaults } from '../utils';
import Trajectory from './trajectory';
/**
 * Frames trajectory class. Gets data from a frames object.
 */
class FramesTrajectory extends Trajectory {
    constructor(frames, structure, params) {
        const p = params || {};
        p.timeOffset = defaults(p.timeOffset, frames.timeOffset);
        p.deltaTime = defaults(p.deltaTime, frames.deltaTime);
        super('', structure, p);
        this.name = frames.name;
        this.path = frames.path;
        this.frames = frames.coordinates;
        this.boxes = frames.boxes;
        this._init(structure);
    }
    get type() { return 'frames'; }
    _makeAtomIndices() {
        if (this.structure.type === 'StructureView') {
            this.atomIndices = this.structure.getAtomIndices();
        }
        else {
            this.atomIndices = undefined;
        }
    }
    _loadFrame(i, callback) {
        let coords;
        const frame = this.frames[i];
        if (this.atomIndices) {
            const indices = this.atomIndices;
            const m = indices.length;
            coords = new Float32Array(m * 3);
            for (let j = 0; j < m; ++j) {
                const j3 = j * 3;
                const idx3 = indices[j] * 3;
                coords[j3 + 0] = frame[idx3 + 0];
                coords[j3 + 1] = frame[idx3 + 1];
                coords[j3 + 2] = frame[idx3 + 2];
            }
        }
        else {
            coords = new Float32Array(frame);
        }
        const box = this.boxes[i];
        const frameCount = this.frames.length;
        this._process(i, box, coords, frameCount);
        if (typeof callback === 'function') {
            callback();
        }
    }
    _loadFrameCount() {
        if (this.frames) {
            this._setFrameCount(this.frames.length);
        }
    }
}
export default FramesTrajectory;
