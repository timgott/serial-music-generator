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

function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
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
    if (currentRow.length < minLength) {
        const newRow = repeatNotesPass(getRandomRow(matrix));
        const combined = currentRow.concat(newRow)

        return fillRowToLength(minLength, matrix, combined);
    }
    else {
        return currentRow;
    }
}

const rhythmicUnit = 16;

function keysToNotes(keys, rhythmPatterns) {
    function nextNote(currentNotes, i, pattern, patternIndex) {
        if (!pattern || patternIndex >= pattern.length)
            return nextNote(currentNotes, i, choose(rhythmPatterns), 0);

        if (i >= keys.length)
            return currentNotes

        const note = {
            key: keys[i],
            duration: pattern[patternIndex]
        }

        const newNotes = currentNotes.concat(note);

        return nextNote(newNotes, i + 1, pattern, patternIndex + 1);
    }

    return nextNote([], 0);
}

function compose(minLength) {
    const rhythmicPatterns = [[2, 2, 2, 4], [4, 1]];
    const matrix = generateMatrix();

    const melody = fillRowToLength(minLength, matrix, getReihe(matrix));
    return keysToNotes(melody, rhythmicPatterns);
}

function noteToABC(note) {
    const noteMap = ["c", "^c", "d", "^d", "e", "f", "^f", "g", "^g", "a", "^a", "b"];
    return noteMap[note.key] + note.duration;
}

function notesToAbc(notes) {
    const str = notes.map(note => noteToABC(note)).join(" ");
    console.log(str);
    return str;
}

console.debug("Reset")
ABCJS.renderAbc('sheet_container', notesToAbc(compose(5)));