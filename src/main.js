const noteMap = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

vf = new Vex.Flow.Factory({
    renderer: { elementId: "sheet_container", width: 1000, height: 1000}
})

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

function clamp12(x) {
    while (x < 0)
        x += 12;
    while (x >= 12)
        x -= 12;
    
    return x;
}

function generate() {
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

function toneRowToStave(system, row) {
    let notes = [];
    for (let i = 0; i < row.length; i++) {
        notes[i] = vf.StaveNote({
            keys: [Vex.Flow.integerToNote(row[i])+"/4"],
            duration: "4"
        })
    }

    let voice = vf.Voice({time: "12/4"}).addTickables(notes);

    system.addStave({
        voices: [
            voice
        ]
    }).addClef("treble").addTimeSignature("4/4")
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

let matrix = generate();

let score = vf.EasyScore();
let system = vf.System();

toneRowToStave(system, getReihe(matrix));
toneRowToStave(system, getUmkehrung(matrix, 1));
toneRowToStave(system, getReihe(matrix, 2));

vf.draw();