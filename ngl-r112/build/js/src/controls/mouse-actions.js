/**
 * @file Mouse Actions
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { almostIdentity } from '../math/math-utils';
import SurfaceRepresentation from '../representation/surface-representation';
/**
 * Mouse actions provided as static methods
 */
class MouseActions {
    /**
     * Zoom scene based on scroll-delta
     * @param {Stage} stage - the stage
     * @param {Number} delta - amount to zoom
     * @return {undefined}
     */
    static zoomScroll(stage, delta) {
        stage.trackballControls.zoom(delta);
    }
    /**
     * Move near clipping plane based on scroll-delta
     * @param {Stage} stage - the stage
     * @param {Number} delta - amount to move clipping plane
     * @return {undefined}
     */
    static clipNearScroll(stage, delta) {
        const sp = stage.getParameters();
        stage.setParameters({ clipNear: sp.clipNear + delta / 10 });
    }
    /**
     * Move clipping planes based on scroll-delta.
     * @param {Stage} stage - the stage
     * @param {Number} delta - direction to move planes
     * @return {undefined}
     */
    static focusScroll(stage, delta) {
        const focus = stage.getFocus();
        const sign = Math.sign(delta);
        const step = sign * almostIdentity((100 - focus) / 10, 5, 0.2);
        stage.setFocus(focus + step);
    }
    /**
     * Zoom scene based on scroll-delta and
     * move focus planes based on camera position (zoom)
     * @param {Stage} stage - the stage
     * @param {Number} delta - amount to move focus planes and zoom
     * @return {undefined}
     */
    static zoomFocusScroll(stage, delta) {
        stage.trackballControls.zoom(delta);
        const z = stage.viewer.camera.position.z;
        stage.setFocus(100 - Math.abs(z / 8));
    }
    /**
     * Change isolevel of volume surfaces based on scroll-delta
     * @param {Stage} stage - the stage
     * @param {Number} delta - amount to change isolevel
     * @return {undefined}
     */
    static isolevelScroll(stage, delta) {
        const d = Math.sign(delta) / 10;
        stage.eachRepresentation((reprElem, comp) => {
            if (reprElem.repr instanceof SurfaceRepresentation) {
                const p = reprElem.getParameters(); // TODO
                if (p.isolevelScroll) {
                    reprElem.setParameters({ isolevel: p.isolevel + d });
                }
            }
        });
    }
    /**
     * Pan scene based on mouse coordinate changes
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to pan in x direction
     * @param {Number} dy - amount to pan in y direction
     * @return {undefined}
     */
    static panDrag(stage, dx, dy) {
        stage.trackballControls.pan(dx, dy);
    }
    /**
     * Rotate scene based on mouse coordinate changes
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to rotate in x direction
     * @param {Number} dy - amount to rotate in y direction
     * @return {undefined}
     */
    static rotateDrag(stage, dx, dy) {
        stage.trackballControls.rotate(dx, dy);
    }
    /**
     * Rotate scene around z axis based on mouse coordinate changes
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to rotate in x direction
     * @param {Number} dy - amount to rotate in y direction
     * @return {undefined}
     */
    static zRotateDrag(stage, dx, dy) {
        stage.trackballControls.zRotate(dx, dy);
    }
    /**
     * Zoom scene based on mouse coordinate changes
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to zoom
     * @param {Number} dy - amount to zoom
     * @return {undefined}
     */
    static zoomDrag(stage, dx, dy) {
        stage.trackballControls.zoom((dx + dy) / -2);
    }
    /**
     * Zoom scene based on mouse coordinate changes and
     * move focus planes based on camera position (zoom)
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to zoom and focus
     * @param {Number} dy - amount to zoom and focus
     * @return {undefined}
     */
    static zoomFocusDrag(stage, dx, dy) {
        stage.trackballControls.zoom((dx + dy) / -2);
        const z = stage.viewer.camera.position.z;
        stage.setFocus(100 - Math.abs(z / 8));
    }
    /**
     * Pan picked component based on mouse coordinate changes
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to pan in x direction
     * @param {Number} dy - amount to pan in y direction
     * @return {undefined}
     */
    static panComponentDrag(stage, dx, dy) {
        stage.trackballControls.panComponent(dx, dy);
    }
    /**
     * Pan picked atom based on mouse coordinate changes
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to pan in x direction
     * @param {Number} dy - amount to pan in y direction
     * @return {undefined}
     */
    static panAtomDrag(stage, dx, dy) {
        stage.trackballControls.panAtom(dx, dy);
    }
    /**
     * Rotate picked component based on mouse coordinate changes
     * @param {Stage} stage - the stage
     * @param {Number} dx - amount to rotate in x direction
     * @param {Number} dy - amount to rotate in y direction
     * @return {undefined}
     */
    static rotateComponentDrag(stage, dx, dy) {
        stage.trackballControls.rotateComponent(dx, dy);
    }
    /**
     * Move picked element to the center of the screen
     * @param {Stage} stage - the stage
     * @param {PickingProxy} pickingProxy - the picking data object
     * @return {undefined}
     */
    static movePick(stage, pickingProxy) {
        if (pickingProxy) {
            stage.animationControls.move(pickingProxy.position.clone());
        }
    }
    /**
     * Show tooltip with information of picked element
     * @param {Stage} stage - the stage
     * @param {PickingProxy} pickingProxy - the picking data object
     * @return {undefined}
     */
    static tooltipPick(stage, pickingProxy) {
        const tt = stage.tooltip;
        const sp = stage.getParameters();
        if (sp.tooltip && pickingProxy) {
            const mp = pickingProxy.mouse.position;
            tt.innerText = pickingProxy.getLabel();
            tt.style.bottom = (window.innerHeight - mp.y + 3) + 'px';
            tt.style.left = (mp.x + 3) + 'px';
            tt.style.display = 'block';
        }
        else {
            tt.style.display = 'none';
        }
    }
    static measurePick(stage, pickingProxy) {
        if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
            const atom = pickingProxy.atom || pickingProxy.closestBondAtom;
            const sc = pickingProxy.component;
            sc.measurePick(atom);
        }
        else {
            stage.measureClear();
        }
    }
}
export const MouseActionPresets = {
    default: [
        ['scroll', MouseActions.zoomScroll],
        ['scroll-shift', MouseActions.focusScroll],
        ['scroll-ctrl', MouseActions.isolevelScroll],
        ['scroll-shift-ctrl', MouseActions.zoomFocusScroll],
        ['drag-left', MouseActions.rotateDrag],
        ['drag-right', MouseActions.panDrag],
        ['drag-ctrl-left', MouseActions.panDrag],
        ['drag-ctrl-right', MouseActions.zRotateDrag],
        ['drag-shift-left', MouseActions.zoomDrag],
        ['drag-middle', MouseActions.zoomFocusDrag],
        ['drag-ctrl-shift-right', MouseActions.panComponentDrag],
        ['drag-ctrl-shift-left', MouseActions.rotateComponentDrag],
        ['clickPick-right', MouseActions.measurePick],
        ['clickPick-ctrl-left', MouseActions.measurePick],
        ['clickPick-middle', MouseActions.movePick],
        ['clickPick-left', MouseActions.movePick],
        ['hoverPick', MouseActions.tooltipPick]
    ],
    pymol: [
        ['drag-left', MouseActions.rotateDrag],
        ['drag-middle', MouseActions.panDrag],
        ['drag-right', MouseActions.zoomDrag],
        ['drag-shift-right', MouseActions.focusScroll],
        ['clickPick-ctrl+shift-middle', MouseActions.movePick],
        ['hoverPick', MouseActions.tooltipPick]
    ],
    coot: [
        ['scroll', MouseActions.isolevelScroll],
        ['drag-left', MouseActions.rotateDrag],
        ['drag-middle', MouseActions.panDrag],
        ['drag-ctrl-left', MouseActions.panDrag],
        ['drag-right', MouseActions.zoomFocusDrag],
        ['drag-ctrl-right', MouseActions.focusScroll],
        ['clickPick-middle', MouseActions.movePick],
        ['hoverPick', MouseActions.tooltipPick]
    ],
    astexviewer: [
        ['drag-left', MouseActions.rotateDrag],
        ['drag-ctrl-left', MouseActions.panDrag],
        ['drag-shift-left', MouseActions.zoomDrag],
        ['scroll', MouseActions.focusScroll],
        ['clickPick-middle', MouseActions.movePick],
        ['hoverPick', MouseActions.tooltipPick]
    ]
};
export default MouseActions;
