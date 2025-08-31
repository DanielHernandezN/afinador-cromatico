// Variables principales
let audioContext;
let referenciaHz = 440; // Valor por defecto
let isRunning = false;
let source;
let analyser;
let bufferLength;
let dataArray;

// Selección de elementos
const iniciarBtn = document.getElementById("iniciar");
const detenerBtn = document.getElementById("detener");
const frecuenciaSelector = document.getElementById("frecuenciaReferencia");
const frecuenciaDisplay = document.getElementById("frecuencia");
const letraDisplay = document.querySelector(".letra");
const subirIcon = document.querySelector(".subir");
const bajarIcon = document.querySelector(".bajar");
const rectangulo = document.querySelector(".rectangulo"); // Box shadow

// Actualizar referencia de Hertz al cambiar
frecuenciaSelector.addEventListener("change", () => {
    referenciaHz = parseFloat(frecuenciaSelector.value);
});

// Función para iniciar afinador
iniciarBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (isRunning) return;
    isRunning = true;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 2048;
        bufferLength = analyser.fftSize;
        dataArray = new Float32Array(bufferLength);

        detectarFrecuencia();
    } catch (err) {
        console.error("Error al acceder al micrófono:", err);
    }
});

// Función para detener afinador
detenerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    isRunning = false;
    if (source) source.disconnect();
    if (audioContext) audioContext.close();
    frecuenciaDisplay.textContent = "-";
    letraDisplay.textContent = "-";
    subirIcon.style.opacity = 0.3;
    bajarIcon.style.opacity = 0.3;
    rectangulo.style.boxShadow = "0 0 20px 5px #888";
});

// Detección de frecuencia con autocorrelación
function detectarFrecuencia() {
    if (!isRunning) return;

    analyser.getFloatTimeDomainData(dataArray);
    const freq = autoCorrelacion(dataArray, audioContext.sampleRate);

    if (freq !== -1) {
        frecuenciaDisplay.textContent = freq.toFixed(2);
        const nota = notaCercana(freq, referenciaHz);
        letraDisplay.textContent = nota;

        const cent = desviacionCent(freq, referenciaHz);

        // Indicadores de subir/bajar
        if (cent > 5) {          
            subirIcon.style.opacity = 0.3;
            bajarIcon.style.opacity = 1;
        } else if (cent < -5) {  
            subirIcon.style.opacity = 1;
            bajarIcon.style.opacity = 0.3;
        } else {                 
            subirIcon.style.opacity = 0.3;
            bajarIcon.style.opacity = 0.3;
        }

        // Cambiar box-shadow según afinación
        const maxDiferencia = 5; // cent
        const ratio = Math.min(Math.abs(cent) / maxDiferencia, 1);
        const r = Math.floor(255 * ratio);
        const g = Math.floor(255 * (1 - ratio));
        rectangulo.style.boxShadow = `0 0 20px 5px rgb(${r},${g},0)`;

    } else {
        frecuenciaDisplay.textContent = "-";
        letraDisplay.textContent = "-";
        subirIcon.style.opacity = 0.3;
        bajarIcon.style.opacity = 0.3;
        rectangulo.style.boxShadow = "0 0 20px 5px #888"; // Color normal
    }

    requestAnimationFrame(detectarFrecuencia);
}

// Función de autocorrelación
function autoCorrelacion(buffer, sampleRate) {
    let SIZE = buffer.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        let val = buffer[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // Señal muy débil

    let r1 = 0, r2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buffer[i]) < 0.02) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buffer[SIZE - i]) < 0.02) { r2 = SIZE - i; break; }
    }

    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - i; j++) {
            c[i] = c[i] + buffer[j] * buffer[j + i];
        }
    }

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;

    return sampleRate / T0;
}

// Conversión de frecuencia a nota
function notaCercana(freq, referencia) {
    const notas = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const A4 = referencia;
    const semitonos = 12 * Math.log2(freq / A4);
    const notaIndex = Math.round(semitonos) + 9 + 12 * 4; // Ajuste para E estándar
    return notas[(notaIndex % 12 + 12) % 12];
}

// Función para calcular desviación en centésimos
function desviacionCent(freq, referencia) {
    const semitonos = 12 * Math.log2(freq / referencia);
    return Math.round((semitonos - Math.round(semitonos)) * 100);
}
