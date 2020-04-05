/**
 * @file Kin Parser
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */
import { Debug, Log, ParserRegistry } from '../globals';
import Parser from './parser';
function hsvToRgb(h, s, v) {
    h /= 360;
    s /= 100;
    v /= 100;
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    return [r, g, b];
}
const ColorDict = {
    red: hsvToRgb(0, 100, 100),
    orange: hsvToRgb(20, 100, 100),
    gold: hsvToRgb(40, 100, 100),
    yellow: hsvToRgb(60, 100, 100),
    lime: hsvToRgb(80, 100, 100),
    green: hsvToRgb(120, 80, 100),
    sea: hsvToRgb(150, 100, 100),
    cyan: hsvToRgb(180, 100, 85),
    sky: hsvToRgb(210, 75, 95),
    blue: hsvToRgb(240, 70, 100),
    purple: hsvToRgb(275, 75, 100),
    magenta: hsvToRgb(300, 95, 100),
    hotpink: hsvToRgb(335, 100, 100),
    pink: hsvToRgb(350, 55, 100),
    peach: hsvToRgb(25, 75, 100),
    lilac: hsvToRgb(275, 55, 100),
    pinktint: hsvToRgb(340, 30, 100),
    peachtint: hsvToRgb(25, 50, 100),
    yellowtint: hsvToRgb(60, 50, 100),
    greentint: hsvToRgb(135, 40, 100),
    bluetint: hsvToRgb(220, 40, 100),
    lilactint: hsvToRgb(275, 35, 100),
    white: hsvToRgb(0, 0, 100),
    gray: hsvToRgb(0, 0, 50),
    brown: hsvToRgb(20, 45, 75),
    deadwhite: [1, 1, 1],
    deadblack: [0, 0, 0],
    invisible: [0, 0, 0]
};
const reWhitespaceComma = /[\s,]+/;
const reCurlyWhitespace = /[^{}\s]*{[^{}]+}|[^{}\s]+/g;
const reTrimCurly = /^{+|}+$/g;
const reTrimQuotes = /^['"]+|['"]+$/g;
const reCollapseEqual = /\s*=\s*/g;
function parseListDef(line) {
    let name;
    let defaultColor;
    let master = [];
    let width;
    line = line.replace(reCollapseEqual, '=');
    const lm = line.match(reCurlyWhitespace);
    for (let j = 1; j < lm.length; ++j) {
        const e = lm[j];
        if (e[0] === '{') {
            name = e.substring(1, e.length - 1);
        }
        else {
            const es = e.split('=');
            if (es.length === 2) {
                if (es[0] === 'color') {
                    defaultColor = ColorDict[es[1]];
                }
                else if (es[0] === 'width') {
                    width = parseInt(es[1]);
                }
                else if (es[0] === 'master') {
                    master.push(es[1].replace(reTrimCurly, ''));
                }
            }
        }
    }
    return {
        listName: name,
        listColor: defaultColor,
        listMasters: master,
        listWidth: width
    };
}
function parseListElm(line) {
    line = line.trim();
    const idx1 = line.indexOf('{');
    const idx2 = line.indexOf('}');
    const ls = line.substr(idx2 + 1).split(reWhitespaceComma);
    const label = line.substr(idx1 + 1, idx2 - 1);
    const position = [
        parseFloat(ls[ls.length - 3]),
        parseFloat(ls[ls.length - 2]),
        parseFloat(ls[ls.length - 1])
    ];
    let color, width, radius;
    for (let lsindex = 4; lsindex <= ls.length; lsindex++) {
        const literal = ls[ls.length - lsindex];
        if (literal in ColorDict) {
            color = ColorDict[ls[ls.length - lsindex]];
        }
        if (literal.startsWith('width')) {
            width = parseInt(literal.substring(5));
        }
        if (literal.startsWith('r=')) {
            radius = parseFloat(literal.split('=')[1]);
        }
    }
    // const color = line[ idx2 + 1 ] === ' ' ? undefined : ColorDict[ ls[ 0 ] ]
    return {
        label: label,
        position: position,
        color: color,
        radius: radius,
        width: width
    };
}
function parseStr(line) {
    const start = line.indexOf('{');
    const end = line.indexOf('}');
    return line.substring(start !== -1 ? start + 1 : 0, end !== -1 ? end : undefined).trim();
}
function parseFlag(line) {
    const end = line.indexOf('}');
    return end === -1 ? undefined : line.substr(end + 1).trim();
}
function parseGroup(line) {
    let name;
    let flags = {};
    line = line.replace(reCollapseEqual, '=');
    const lm = line.match(reCurlyWhitespace);
    for (let j = 1; j < lm.length; ++j) {
        const e = lm[j];
        if (e[0] === '{') {
            name = e.substring(1, e.length - 1);
        }
        else {
            const es = e.split('=');
            if (es.length === 2) {
                flags[es[0]] = es[1].replace(reTrimCurly, '');
            }
            else {
                flags[es[0]] = true;
            }
        }
    }
    return [name, flags];
}
function convertKinTriangleArrays(ribbonObject) {
    // have to convert ribbons/triangle lists from stripdrawmode to normal drawmode
    // index                    [ 0 1 2 3 4 5 6 7 8 91011 ]
    // label [ 0 1 2 3 4 5 ] to [ 0 1 2 1 2 3 2 3 4 3 4 5 ]
    // convertedindex                                      [ 0 1 2 3 4 5 6 7 8 91011121314151617181920212223242526 ]
    // index          [ 0 1 2 3 4 5 6 7 8 91011121314 ]    [ 0 1 2 3 4 5 6 7 8 3 4 5 6 7 8 91011 6 7 8 91011121314 ]
    // position/color [ 0 0 0 1 1 1 2 2 2 3 3 3 4 4 4 ] to [ 0 0 0 1 1 1 2 2 2 1 1 1 2 2 2 3 3 3 2 2 2 3 3 3 4 4 4 ]
    let { labelArray, positionArray, colorArray } = ribbonObject;
    let convertedLabels = [];
    for (let i = 0; i < (labelArray.length - 2) * 3; ++i) {
        convertedLabels[i] = labelArray[i - Math.floor(i / 3) * 2];
    }
    let convertedPositions = [];
    for (let i = 0; i < (positionArray.length / 3 - 2) * 9; ++i) {
        convertedPositions[i] = positionArray[i - Math.floor(i / 9) * 6];
    }
    let convertedColors = [];
    for (let i = 0; i < (colorArray.length / 3 - 2) * 9; ++i) {
        convertedColors[i] = colorArray[i - Math.floor(i / 9) * 6];
    }
    return {
        name: ribbonObject.name,
        masterArray: ribbonObject.masterArray,
        labelArray: convertedLabels,
        positionArray: convertedPositions,
        colorArray: convertedColors
    };
}
class KinParser extends Parser {
    get type() { return 'kin'; }
    get __objName() { return 'kinemage'; }
    _parse() {
        // http://kinemage.biochem.duke.edu/software/king.php
        if (Debug)
            Log.time(`KinParser._parse ${this.name}`);
        const kinemage = {
            kinemage: undefined,
            onewidth: undefined,
            '1viewid': undefined,
            pdbfile: undefined,
            texts: [],
            text: '',
            captions: [],
            caption: '',
            groupDict: {},
            subgroupDict: {},
            masterDict: {},
            pointmasterDict: {},
            dotLists: [],
            vectorLists: [],
            ballLists: [],
            ribbonLists: []
        };
        this.kinemage = kinemage;
        let isDotList = false;
        let prevDotLabel = '';
        let dotDefaultColor;
        let dotLabel, dotPosition, dotColor;
        let isVectorList = false;
        let prevVecLabel = '';
        let prevVecPosition, prevVecColor;
        let vecDefaultColor, vecDefaultWidth;
        let vecLabel1, vecLabel2, vecPosition1, vecPosition2, vecColor1, vecColor2;
        let isBallList = false;
        let prevBallLabel = '';
        let ballRadius, ballDefaultColor;
        let ballLabel, ballPosition, ballColor;
        let isRibbonList = false;
        let prevRibbonPointLabel = '';
        let ribbonListDefaultColor;
        let ribbonPointLabelArray, ribbonPointPositionArray, ribbonPointColorArray;
        let isText = false;
        let isCaption = false;
        // @vectorlist {mc} color= white  master= {mainchain}
        // { n   thr A   1  B13.79 1crnFH} P 17.047, 14.099, 3.625 { n   thr A   1  B13.79 1crnFH} L 17.047, 14.099, 3.625
        // @dotlist {x} color=white master={vdw contact} master={dots}
        // { CB  THR   1  A}sky  'P' 18.915,14.199,5.024
        function _parseChunkOfLines(_i, _n, lines) {
            for (let i = _i; i < _n; ++i) {
                const line = lines[i];
                if (line[0] === '@') {
                    isDotList = false;
                    isVectorList = false;
                    isBallList = false;
                    isRibbonList = false;
                    isText = false;
                    isCaption = false;
                }
                if (!line) {
                    isDotList = false;
                    isVectorList = false;
                    isBallList = false;
                    isRibbonList = false;
                }
                else if (line.startsWith('@dotlist')) {
                    // @dotlist {x} color=white master={vdw contact} master={dots}
                    let { listColor, listName, listMasters } = parseListDef(line);
                    isDotList = true;
                    prevDotLabel = '';
                    dotLabel = [];
                    dotPosition = [];
                    dotColor = [];
                    dotDefaultColor = listColor;
                    kinemage.dotLists.push({
                        name: listName,
                        masterArray: listMasters,
                        labelArray: dotLabel,
                        positionArray: dotPosition,
                        colorArray: dotColor
                    });
                }
                else if (line.startsWith('@vectorlist')) {
                    // @vectorlist {x} color=white master={small overlap} master={dots}
                    let { listMasters, listName, listWidth, listColor } = parseListDef(line);
                    if (listMasters) {
                        listMasters.forEach(function (name) {
                            if (!kinemage.masterDict[name]) {
                                kinemage.masterDict[name] = {
                                    indent: false,
                                    visible: false
                                };
                            }
                        });
                    }
                    isVectorList = true;
                    prevVecLabel = '';
                    prevVecPosition = null;
                    prevVecColor = null;
                    vecLabel1 = [];
                    vecLabel2 = [];
                    vecPosition1 = [];
                    vecPosition2 = [];
                    vecColor1 = [];
                    vecColor2 = [];
                    vecDefaultColor = listColor;
                    vecDefaultWidth = [];
                    if (listWidth) {
                        vecDefaultWidth.push(listWidth);
                    }
                    kinemage.vectorLists.push({
                        name: listName,
                        masterArray: listMasters,
                        label1Array: vecLabel1,
                        label2Array: vecLabel2,
                        position1Array: vecPosition1,
                        position2Array: vecPosition2,
                        color1Array: vecColor1,
                        color2Array: vecColor2,
                        width: vecDefaultWidth
                    });
                }
                else if (line.startsWith('@balllist')) {
                    let { listName, listColor, listMasters } = parseListDef(line);
                    if (listMasters) {
                        listMasters.forEach(function (name) {
                            if (!kinemage.masterDict[name]) {
                                kinemage.masterDict[name] = {
                                    indent: false,
                                    visible: false
                                };
                            }
                        });
                    }
                    isBallList = true;
                    prevBallLabel = '';
                    ballLabel = [];
                    ballRadius = [];
                    ballPosition = [];
                    ballColor = [];
                    ballDefaultColor = listColor;
                    kinemage.ballLists.push({
                        name: listName,
                        masterArray: listMasters,
                        labelArray: ballLabel,
                        radiusArray: ballRadius,
                        positionArray: ballPosition,
                        colorArray: ballColor
                    });
                }
                else if (line.startsWith('@ribbonlist')) {
                    let { listMasters, listName, listColor } = parseListDef(line);
                    if (listMasters) {
                        listMasters.forEach(function (name) {
                            if (!kinemage.masterDict[name]) {
                                kinemage.masterDict[name] = {
                                    indent: false,
                                    visible: false
                                };
                            }
                        });
                    }
                    isRibbonList = true;
                    prevRibbonPointLabel = '';
                    ribbonPointLabelArray = [];
                    ribbonPointPositionArray = [];
                    ribbonPointColorArray = [];
                    ribbonListDefaultColor = listColor;
                    kinemage.ribbonLists.push({
                        name: listName,
                        masterArray: listMasters,
                        labelArray: ribbonPointLabelArray,
                        positionArray: ribbonPointPositionArray,
                        colorArray: ribbonPointColorArray
                    });
                }
                else if (line.startsWith('@text')) {
                    isText = true;
                    kinemage.texts.push(line.substr(5));
                }
                else if (line.startsWith('@caption')) {
                    isCaption = true;
                    kinemage.captions.push(line.substr(8));
                }
                else if (isDotList) {
                    // { CB  THR   1  A}sky  'P' 18.915,14.199,5.024
                    let { label, color, position } = parseListElm(line);
                    if (label === '"') {
                        label = prevDotLabel;
                    }
                    else {
                        prevDotLabel = label;
                    }
                    if (color === undefined) {
                        color = dotDefaultColor;
                    }
                    dotLabel.push(label);
                    dotPosition.push(...position);
                    dotColor.push(...color);
                }
                else if (isVectorList) {
                    // { n   thr A   1  B13.79 1crnFH} P 17.047, 14.099, 3.625 { n   thr A   1  B13.79 1crnFH} L 17.047, 14.099, 3.625
                    const idx1 = line.indexOf('{');
                    const idx2 = line.indexOf('{', idx1 + 1);
                    let line1, line2;
                    if (idx2 === -1) {
                        line1 = line;
                        line2 = line;
                    }
                    else {
                        line1 = line.substr(0, idx2);
                        line2 = line.substr(idx2);
                    }
                    let { label, color, width, position } = parseListElm(line1);
                    if (label === '"') {
                        label = prevVecLabel;
                    }
                    else {
                        prevVecLabel = label;
                    }
                    if (color === undefined) {
                        color = vecDefaultColor;
                    }
                    if (width) {
                        vecDefaultWidth.push(width);
                    }
                    vecLabel1.push(label);
                    vecPosition1.push(...position);
                    vecColor1.push(...color);
                    //
                    if (idx2 === -1 && prevVecPosition) {
                        vecLabel2.push(prevVecLabel);
                        vecPosition2.push(...prevVecPosition);
                        vecColor2.push(...prevVecColor);
                        prevVecLabel = label;
                        prevVecPosition = position;
                        prevVecColor = color;
                    }
                    else {
                        let { label, color, position } = parseListElm(line2);
                        if (label === '"') {
                            label = prevVecLabel;
                        }
                        else {
                            prevVecLabel = label;
                        }
                        if (color === undefined) {
                            color = vecDefaultColor;
                        }
                        vecLabel2.push(label);
                        vecPosition2.push(...position);
                        vecColor2.push(...color);
                        prevVecPosition = position;
                        prevVecColor = color;
                    }
                }
                else if (isBallList) {
                    // {cb arg A   1   1.431 -106.80} r=1.431  39.085, 8.083, 22.182
                    let { label, radius, color, position } = parseListElm(line);
                    if (label === '"') {
                        label = prevBallLabel;
                    }
                    else {
                        prevBallLabel = label;
                    }
                    if (radius === undefined) {
                        radius = 1; // temporary default radius
                    }
                    if (color === undefined) {
                        color = ballDefaultColor;
                    }
                    ballLabel.push(label);
                    ballRadius.push(radius);
                    ballPosition.push(...position);
                    ballColor.push(...color);
                }
                else if (isRibbonList) {
                    let { label, color, position } = parseListElm(line);
                    if (label === '"') {
                        label = prevRibbonPointLabel;
                    }
                    else {
                        prevRibbonPointLabel = label;
                    }
                    if (color === undefined) {
                        color = ribbonListDefaultColor;
                    }
                    ribbonPointLabelArray.push(label);
                    ribbonPointPositionArray.push(...position);
                    ribbonPointColorArray.push(...color);
                }
                else if (isText) {
                    kinemage.texts.push(line);
                }
                else if (isCaption) {
                    kinemage.captions.push(line);
                }
                else if (line.startsWith('@kinemage')) {
                    kinemage.kinemage = parseInt(line.substr(9).trim());
                }
                else if (line.startsWith('@onewidth')) {
                    kinemage.onewidth = true;
                }
                else if (line.startsWith('@1viewid')) {
                    kinemage['1viewid'] = parseStr(line);
                }
                else if (line.startsWith('@pdbfile')) {
                    kinemage.pdbfile = parseStr(line);
                }
                else if (line.startsWith('@group')) {
                    const [name, flags] = parseGroup(line);
                    if (!kinemage.groupDict[name]) {
                        kinemage.groupDict[name] = {
                            dominant: false,
                            animate: false
                        };
                    }
                    for (let key in flags) {
                        kinemage.groupDict[name][key] = flags[key];
                    }
                }
                else if (line.startsWith('@subgroup')) {
                    const [name, flags] = parseGroup(line);
                    if (!kinemage.subgroupDict[name]) {
                        kinemage.subgroupDict[name] = {
                            dominant: false,
                            animate: false,
                            master: undefined
                        };
                    }
                    for (let key in flags) {
                        kinemage.subgroupDict[name][key] = flags[key];
                    }
                }
                else if (line.startsWith('@master')) {
                    const name = parseStr(line);
                    const flag = parseFlag(line);
                    if (!kinemage.masterDict[name]) {
                        kinemage.masterDict[name] = {
                            indent: false,
                            visible: false
                        };
                    }
                    if (flag === 'on') {
                        kinemage.masterDict[name].visible = true;
                    }
                    else if (flag === 'off') {
                        kinemage.masterDict[name].visible = false;
                    }
                    else if (flag === 'indent') {
                        kinemage.masterDict[name].indent = true;
                    }
                    else if (!flag) {
                        // nothing to do
                    }
                }
                else if (line.startsWith('@pointmaster')) {
                    const [name, flags] = parseGroup(line);
                    kinemage.pointmasterDict[name] = {
                        id: Object.keys(flags)[0].replace(reTrimQuotes, '')
                    };
                }
                else {
                    console.log(line);
                }
            }
        }
        this.streamer.eachChunkOfLines(function (lines /*, chunkNo, chunkCount */) {
            _parseChunkOfLines(0, lines.length, lines);
        });
        kinemage.text = kinemage.texts.join('\n').trim();
        kinemage.caption = kinemage.captions.join('\n').trim();
        if (kinemage.ribbonLists) {
            let convertedLists = [];
            kinemage.ribbonLists.forEach(function (listObject) {
                convertedLists.push(convertKinTriangleArrays(listObject));
            });
            kinemage.ribbonLists = convertedLists;
        }
        if (Debug)
            Log.timeEnd(`KinParser._parse ${this.name}`);
    }
}
ParserRegistry.add('kin', KinParser);
export default KinParser;
