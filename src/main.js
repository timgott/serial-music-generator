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

function keysToNotes(keys, rhythmPatterns) {
    function nextNote(currentNotes, noteIndex, pattern, patternIndex) {
        // pattern finished?
        if (!pattern || patternIndex >= pattern.length)
            return nextNote(currentNotes, noteIndex, choose(rhythmPatterns), 0);

        // end of notes reached?
        if (noteIndex >= keys.length)
            return currentNotes

        const duration = pattern[patternIndex]; // can be negative for rests
        
        const lastNote = currentNotes[currentNotes.length-1];
        const tick = lastNote ? lastNote.tick + lastNote.duration : 0;

        // is rest?
        if (duration < 0) {
            const rest = {
                isRest: true,
                duration: -duration,
                tick: tick
            };

            const newNotes = currentNotes.concat(rest);
            return nextNote(newNotes, noteIndex, pattern, patternIndex + 1); // doesn't advance in melody
        }
        
        // regular note
        const note = {
            key: keys[noteIndex],
            duration: duration,
            octave: 0,
            tick: tick
        };

        const newNotes = currentNotes.concat(note);
        return nextNote(newNotes, noteIndex + 1, pattern, patternIndex + 1); // advances in melody and rhythm
    }

    return nextNote([], 0);
}

function shiftOctaves(notes, octaves) {
    return notes.map(function (note) { return { ...note, octave: note.octave + octaves } });
}

function compose(matrix, patternsPerVoice, minLength) {
    const rawVoices = patternsPerVoice.map(function (patterns, i) {
        const startRow = i == 0 ? getReihe(matrix) : [];
        const melodyKeys = fillRowToLength(minLength, matrix, startRow);
        return shiftOctaves(keysToNotes(melodyKeys, patterns), -i * 2);
    });
    
    const minDuration = rawVoices.reduce((lastMin, voice) => {
        const lastNote = voice[voice.length - 1];
        return Math.min(lastMin, lastNote.tick + lastNote.duration);
    }, Infinity);
    
    const cutVoices = rawVoices.map(voice => {
        const cutoffIndex = voice.findIndex(note => note.tick > minDuration);
        console.log(cutoffIndex);
        return cutoffIndex > 0 ? voice.slice(0, cutoffIndex) : voice;
    })
    
    return cutVoices;
}

function noteStringToOctave(noteString, octave) {
    if (octave > 0)
        return noteString.toLowerCase() + "'".repeat(octave - 1);
    else
        return noteString.toUpperCase() + ",".repeat(-octave);
}

function getNoteName(key) {
    const noteNames = ["c", "c", "d", "d", "e", "f", "f", "g", "g", "a", "a", "b"];
    return noteNames[key];
}

function getNoteAccidental(key) {
    const accidentals = ["=", "^", "=", "^", "=", "=", "^", "=", "^", "=", "^", "="];
    return accidentals[key]
}

function hideRepeatedAccidentals(notes, barLength) {
    return notes.reduce(function (notesAccumulator, note) {
        if (note.isRest)
            return [...notesAccumulator, note];

        const noteName = getNoteName(note.key)
        const accidental = getNoteAccidental(note.key)
        const barNumber = Math.floor(note.tick/barLength);
        const lastNote = notesAccumulator.slice().reverse().find(other => Math.floor(other.tick / barLength) == barNumber && getNoteName(other.key) == noteName);
        const lastAccidental = lastNote ? getNoteAccidental(lastNote.key) : "="

        if (accidental === lastAccidental)
            return [...notesAccumulator, { ...note, hideAccidental: true }];
        else
            return [...notesAccumulator, note];
    }, [])
}

function beautifyRests(notes, barLength) {
    const newNotes = notes.reduce(function (acc, note) {
        if (note.isRest) {
            return {
                newNotes: acc.newNotes,
                currentRestDuration: acc.currentRestDuration + note.duration
            };
        }
        else {
            const rest = acc.currentRestDuration > 0 ? [{ isRest: true, tick: note.tick - acc.currentRestDuration, duration: acc.currentRestDuration }] : []

            if (acc.currentRestDuration == undefined || isNaN(acc.currentRestDuration))
                throw "currentRestDuration is wrong";

            return {
                newNotes: [...acc.newNotes, ...rest, note],
                currentRestDuration: 0
            };
        }
    }, { newNotes: [], currentRestDuration: 0 }).newNotes;

    const lastNote = newNotes[newNotes.length - 1];
    const lastTick = lastNote.tick + lastNote.duration;
    const remainingDuration = barLength - lastTick % barLength;

    if (remainingDuration == barLength)
        return newNotes;
    else
        return [...newNotes, { isRest: true, tick: lastTick, duration: remainingDuration }];
}


/* ABC output formatting */
function noteToABC(note) {
    if (note.isRest) {
        return "z" + note.duration
    }
    else {
        const noteName = getNoteName(note.key)
        const accidental = note.hideAccidental ? "" : getNoteAccidental(note.key);

        return accidental + noteStringToOctave(noteName, note.octave) + note.duration;
    }
}

function nextPow2Multiple(x) {
    if (x == 0)
        return Infinity;

    function determinePow2(x, p) {
        if (x % 2 == 0) {
            return determinePow2(x / 2, p*2);
        }
        else {
            return p;
        }
    }

    const pow2 = determinePow2(x, 1);
    const multiple = x / pow2;

    if (multiple % 1 != 0) throw ("something is wrong");

    return pow2 * (multiple + 1);
}

function multiBarNoteToABC(note, barLength) {
    function splitNoteRec(tick, remainingDuration, str) {            
        const tickInBar = tick % barLength;
        const ticksToBarEnd = barLength - tickInBar;
        const ticksToNextFullTick = nextPow2Multiple(tickInBar) - tickInBar;
        const undottedDuration = Math.pow(2, Math.floor(Math.log2(Math.min(remainingDuration, ticksToBarEnd))));
        const dottedDuration = Math.pow(2, Math.floor(Math.log2(Math.min(remainingDuration * 2.0/3.0, ticksToBarEnd)))) * 3.0/2.0;
        const maxDuration = note.isRest ? Math.min(ticksToBarEnd, undottedDuration)
            : Math.min(ticksToBarEnd, ticksToNextFullTick, Math.max(dottedDuration%1 === 0 ? dottedDuration : 0, undottedDuration));

        if (maxDuration <= 0) {
            console.error(tickInBar + " " + ticksToNextFullTick);
            throw "this will break";
        }

        const thereWillBeMoreNotes = remainingDuration > maxDuration

        const newNote = { ...note, tick: tick, duration: Math.min(maxDuration, remainingDuration) };
        const tie = thereWillBeMoreNotes ? (note.isRest?" ":"-") : "";
        const barEnd = ((newNote.tick + newNote.duration) % barLength) == 0 ? "|" : "";
        const newString = str + noteToABC(newNote) + tie + barEnd;

        if (thereWillBeMoreNotes) {
            return splitNoteRec(tick + maxDuration, remainingDuration - maxDuration, newString);
        }
        
        return newString;
    }

    return splitNoteRec(note.tick, note.duration, "");
}

function notesToAbc(notes, barLength) {
    const str = beautifyRests(hideRepeatedAccidentals(notes, barLength), barLength).map(note => multiBarNoteToABC(note, barLength)).join(" ");
    return str;
}


/* Main program */
console.debug("Reset")

// rhythms
const static_rhythm = [[1]];
const rhythm2 = [[-1,2]];
const static_rhythm_with_pause = [[1], [-1]];
const slow_rhythm = [[4],[8],[2,2],[-4],[-8]];
const random_rhythm = [[1],[2],[3],[4],[6],[8],[-1],[-2],[-3],[-4],[-6],[-8]];
const testPatterns = [[2, 2, 2, 4], [4, 1]];
const schoenbergOp33aPatterns = [
    [4, 4, 4, 4, 4, 8, -2],
    [2, 2, 2, 10],
    [2, 2, 8, 10, -4],
    [-2, 2, 2, 7],
    [4, 2, 6, 2, -2],
    [2, 2, 2, -2, 6, 8],
    [5, 1, 2, 2, 2, 2],
    [2, 1, 2, 1, 2, -2, 1, 2, 1, 2],
    [-1, 1, 2, 3, 1, 3],
    [-5, 1, 1]
];
const waveRhythm = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2]
];
const waveRhythm2 = [
    [1,2,3,4,5,4,3,2]
]


function generateSong() {
    // load constants
    const song_length = document.getElementById("input_length").value
    const tempo = document.getElementById("input_tempo").value
    const barLength = document.getElementById("input_barLength").value;
    const rhythmicUnit = document.getElementById("input_rhythmicUnit").value;

    // load rhythms
    const textToRhythmArray = (text) => text.split("\n").map((line) => line.split(" ").map(str => parseInt(str)).filter((x) => isFinite(x))).filter((pattern) => pattern.length > 0);
    const voice1rhythms = textToRhythmArray(document.getElementById("input_rhythm1").value);
    const voice2rhythms = textToRhythmArray(document.getElementById("input_rhythm2").value);

    // generate matrix
    const matrix = generateMatrix();

    // render row
    const row_header = "L:1/4\n";
    const base_row_notes = keysToNotes(getReihe(matrix), static_rhythm);
    ABCJS.renderAbc('row_container', row_header + notesToAbc(base_row_notes, 4));


    // render song
    const voices = compose(matrix, [voice1rhythms, voice2rhythms], song_length);
    const abc =
`X:1
L:1/${rhythmicUnit}
Q:${tempo}
V:1 clef=treble
${notesToAbc(voices[0], barLength)}
V:2 clef=bass
${notesToAbc(voices[1], barLength)}`

    console.log(abc);

    ABCJS.renderAbc('sheet_container', abc, { scrollHorizontal: false, viewportHorizontal: false });
    ABCJS.renderMidi("midi_player", abc, { generateInline: true });

    // print abc output
    document.getElementById("abc_output").textContent = abc;

    // hack to get scrolling working correctly
    document.getElementById("row_container").setAttribute("style", "overflow: auto");
    document.getElementById("sheet_container").setAttribute("style", "overflow: auto");
}

generateSong();

document.getElementById("button_generate").addEventListener("click", () => generateSong());