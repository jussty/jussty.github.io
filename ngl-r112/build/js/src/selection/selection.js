/**
 * @file Selection
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { Signal } from 'signals';
import { parseSele } from './selection-parser';
import { makeAtomTest, makeResidueTest, makeChainTest, makeModelTest } from './selection-test';
import { SelectAllKeyword, SelectNoneKeyword } from './selection-constants';
/**
 * Selection
 */
class Selection {
    /**
     * Create Selection
     * @param {String} string - selection string, see {@tutorial selection-language}
     */
    constructor(string) {
        this.signals = {
            stringChanged: new Signal()
        };
        this.setString(string);
    }
    get type() { return 'selection'; }
    setString(string, silent) {
        if (string === undefined)
            string = this.string || '';
        if (string === this.string)
            return;
        try {
            this.selection = parseSele(string);
        }
        catch (e) {
            // Log.error( e.stack );
            this.selection = { 'error': e.message };
        }
        const selection = this.selection;
        this.string = string;
        this.test = makeAtomTest(selection);
        this.residueTest = makeResidueTest(selection);
        this.chainTest = makeChainTest(selection);
        this.modelTest = makeModelTest(selection);
        this.atomOnlyTest = makeAtomTest(selection, true);
        this.residueOnlyTest = makeResidueTest(selection, true);
        this.chainOnlyTest = makeChainTest(selection, true);
        this.modelOnlyTest = makeModelTest(selection, true);
        if (!silent) {
            this.signals.stringChanged.dispatch(this.string);
        }
    }
    isAllSelection() {
        return SelectAllKeyword.includes(this.string.toUpperCase());
    }
    isNoneSelection() {
        return SelectNoneKeyword.includes(this.string.toUpperCase());
    }
}
export default Selection;
