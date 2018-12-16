function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function chance(p) {
    return Math.random() < p;
}

// melody calculation
function generateMatrix() {
    function clamp12(x) {
        while (x < 0)
            x += 12;
        while (x >= 12)
            x -= 12;
        
        return x;
    }

    let baseRow = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    let baseNumber = baseRow[0];

    let matrix = [];
    for (let x = 0; x < 12; x++) {
        matrix[x] = [];
    }

    for (let y = 0; y < 12; y++) {
        let mirrorOffset = (baseNumber-baseRow[y]);
        for (let x = 0; x < 12; x++) {
            matrix[x][y] = clamp12(baseRow[x] + mirrorOffset);
        }
    }

    return matrix;
}

function krebs(reihe) {
    let k = [];
    for (let i = 0; i < 12; i++) {
        k[i] = reihe[11 - i];
    }
    return k;
}

function getReihe(matrix, n = 0) {
    let a = [];
    for (let i = 0; i < 12; i++) {
        a[i] = matrix[i][n];
    }

    return a;
}

function getUmkehrung(matrix, n = 0) {
    return matrix[n];
}

function getRandomRow(matrix) {
    const n = Math.floor(Math.random() * 12);
    const row = chance(0.5) ? getReihe(matrix, n) : getUmkehrung(matrix, n);
    return chance(0.5) ? row : krebs(row);
}

function repeatNotesPass(sourceRow) {
    function addNotes(row, i) {
        if (i >= sourceRow.length)
            return row;

        const newRow = row.concat(sourceRow[i]);
        // double note
        if (chance(0.1))
            return addNotes(newRow, i)
        else
            return addNotes(newRow, i+1)
    }

    return addNotes([], 0);
}

function fillRowToLength(minLength, matrix, currentRow) {
    const newRow = repeatNotesPass(getRandomRow(matrix));
    const combined = currentRow.concat(newRow)

    if (combined.length < minLength)
        return fillRowToLength(minLength, combined);
    else
        return combined;
}

const rhythmicUnit = 16;

function compose(minLength) {
    const rhythmicPatterns = [[2, 2, 2, 4], [4, 1]];
    const matrix = generateMatrix();

    return fillRowToLength(minLength, matrix, getReihe(matrix));
}

function noteToABC(note) {
    const noteMap = ["c", "^c", "d", "^d", "e", "f", "^f", "g", "^g", "a", "^a", "b"];
    return noteMap[note];
}

function melodyToAbc(melody) {
    function stringBuilder(str, note) {
        const newStr = str + " " + noteToABC(note);
        return newStr;
    }

    const str = melody.reduce(stringBuilder, "");
    console.log(str);
    return str;
}

console.debug("Reset")
ABCJS.renderAbc('sheet_container', melodyToAbc(compose(24)));