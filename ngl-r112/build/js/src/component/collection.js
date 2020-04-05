/**
 * @file Collection
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
class Collection {
    constructor(list = []) {
        this.list = list;
        // remove elements from list when they get disposed
        const n = list.length;
        for (let i = 0; i < n; ++i) {
            const elm = list[i];
            elm.signals.disposed.add(this._remove, this);
        }
    }
    _remove(elm) {
        const idx = this.list.indexOf(elm);
        if (idx !== -1) {
            this.list.splice(idx, 1);
        }
    }
    get first() {
        return this.list.length > 0 ? this.list[0] : undefined;
    }
    forEach(fn) {
        this.list.forEach(fn);
        return this;
    }
    dispose() {
        return this.forEach((elm) => elm.dispose());
    }
}
export default Collection;
