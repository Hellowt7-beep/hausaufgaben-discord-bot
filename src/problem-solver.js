import { GoogleGenerativeAI } from '@google/generative-ai';
import { Storage } from 'megajs';
import { config } from 'dotenv';
import { performOCR, performOCRWithRetry } from './ocr-service.js';

config();

let megaStorage = null;

// Verfügbare Fächer
const SUPPORTED_SUBJECTS = [
    'deutsch', 'mathe', 'english', 'französisch', 'franzoesisch', 'fr',
    'latein', 'geschichte', 'physik', 'chemie', 'religion ev', 'religion kt', 'ethik'
];

async function connectToMega() {
    if (megaStorage) return megaStorage;

    try {
        if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
            throw new Error('MEGA Login-Daten fehlen in .env Datei');
        }

        console.log('🔗 Verbinde mit MEGA...');
        megaStorage = new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD
        });
        await megaStorage.ready;
        console.log('✅ MEGA Verbindung erfolgreich');
        return megaStorage;
    } catch (error) {
        throw new Error('MEGA Verbindung fehlgeschlagen. Prüfe deine Login-Daten.');
    }
}

export async function findBookPage(fach, seiteNummer) {
    const storage = await connectToMega();

    // Normalisiere Fach-Namen
    const normalizedFach = normalizeFach(fach);

    if (!SUPPORTED_SUBJECTS.includes(normalizedFach)) {
        throw new Error(`Fach "${fach}" wird nicht unterstützt. Verfügbare Fächer: ${SUPPORTED_SUBJECTS.join(', ')}`);
    }

    // Suche nach Datei mit verschiedenen Patterns
    const patterns = [
        `${normalizedFach}_seite_${seiteNummer}`,
        `${normalizedFach}_${seiteNummer}`,
        `${fach.toLowerCase()}_seite_${seiteNummer}`,
        `${fach.toLowerCase()}_${seiteNummer}`
    ];

    console.log(`🔍 Suche nach Buchseite: ${patterns.join(' oder ')}`);

    // Durchsuche alle Dateien
    const files = storage.files;
    const foundFile = Object.values(files).find(file => {
        const name = file.name?.toLowerCase();
        return name && patterns.some(pattern =>
            name.includes(pattern.toLowerCase()) &&
            (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg') || name.endsWith('.pdf'))
        );
    });

    if (!foundFile) {
        throw new Error(`Datei nicht gefunden für: ${fach} Seite ${seiteNummer}

Erwartete Dateiformate:
• ${patterns[0]}.jpg/.png
• ${patterns[1]}.jpg/.png

Stelle sicher, dass die Datei in MEGA hochgeladen ist.`);
    }

    console.log(`📖 Buchseite gefunden: ${foundFile.name}`);
    return foundFile;
}

// Neue Funktion: Finde alle Material-Dateien für eine Seite
export async function findMaterialFiles(fach, seiteNummer) {
    const storage = await connectToMega();

    // Normalisiere Fach-Namen
    const normalizedFach = normalizeFach(fach).toUpperCase();

    // Suche nach allen Dateien die mit MATERIAL_[FACH]_SEITE_[NUMMER] anfangen
    const basePattern = `MATERIAL_${normalizedFach}_SEITE_${seiteNummer}`;

    console.log(`🔍 Suche nach Material-Dateien: ${basePattern}*`);

    // Durchsuche alle Dateien
    const files = storage.files;
    const foundFiles = Object.values(files).filter(file => {
        const name = file.name?.toUpperCase();
        return name &&
               name.startsWith(basePattern) &&
               (name.endsWith('.JPG') || name.endsWith('.PNG') || name.endsWith('.JPEG') || name.endsWith('.PDF'));
    });

    if (foundFiles.length === 0) {
        throw new Error(`Keine Material-Dateien gefunden für: ${fach} Seite ${seiteNummer}

Erwartete Dateiformate:
• MATERIAL_${normalizedFach}_SEITE_${seiteNummer}_(1).jpg
• MATERIAL_${normalizedFach}_SEITE_${seiteNummer}_(2).jpg
• etc.

Stelle sicher, dass die Dateien in MEGA hochgeladen sind.`);
    }

    console.log(`📚 ${foundFiles.length} Material-Dateien gefunden:`, foundFiles.map(f => f.name));
    return foundFiles;
}

export async function downloadAndProcessImage(file) {
    try {
        console.log('📥 Lade Datei herunter...');
        // Datei als Buffer herunterladen
        const data = await file.downloadBuffer();

        console.log('🔤 Führe OCR durch...');

        // Verwende verbesserten OCR Service mit Retry-Logic
        const text = await performOCRWithRetry(data, 2);

        if (!text.trim()) {
            throw new Error('Kein Text in der Datei gefunden');
        }

        console.log('✅ Text erfolgreich extrahiert');
        return text;

    } catch (error) {
        throw new Error(`Dateiverarbeitung fehlgeschlagen: ${error.message}`);
    }
}

export async function findHomeworkInMega() {
    try {
        console.log('🔍 Suche ha.jpg in MEGA...');
        const storage = await connectToMega();

        // Durchsuche alle Dateien nach ha.jpg
        const files = storage.files;
        const foundFile = Object.values(files).find(file => {
            const name = file.name?.toLowerCase();
            return name && name.includes('ha') && (
                name.endsWith('.jpg') ||
                name.endsWith('.png') ||
                name.endsWith('.jpeg')
            );
        });

        if (!foundFile) {
            throw new Error('Keine ha.jpg in MEGA gefunden');
        }

        console.log(`📋 Hausaufgaben-Bild gefunden: ${foundFile.name}`);

        // Lade die Datei direkt als Buffer herunter
        const imageBuffer = await foundFile.downloadBuffer();

        // Erstelle einen data URL für die weitere Verarbeitung
        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        return dataUrl;

    } catch (error) {
        throw new Error(`MEGA Suche fehlgeschlagen: ${error.message}`);
    }
}

export async function solveProblem(fach, seiteNummer) {
    try {
        // API Key zur Laufzeit laden
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('🔑 API Key für Lösungen:', apiKey ? `JA (${apiKey.substring(0, 20)}...)` : 'NEIN');

        if (!apiKey || apiKey === 'YOUR_NEW_GEMINI_API_KEY_HERE') {
            throw new Error('GEMINI_API_KEY nicht gesetzt! Bitte in .env Datei eintragen.');
        }

        // GenAI zur Laufzeit initialisieren
        const genAI = new GoogleGenerativeAI(apiKey);

        // Finde die entsprechende Buchseite in MEGA
        const file = await findBookPage(fach, seiteNummer);

        // Lade die Datei herunter und führe OCR durch
        const extractedText = await downloadAndProcessImage(file);

        // Sende an Gemini zur Lösungsfindung
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = createSolutionPrompt(fach, seiteNummer, extractedText);

        console.log('🤖 Generiere Lösungen...');
        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;
        return geminiResponse.text();

    } catch (error) {
        throw error;
    }
}

export async function solveProblemWithImage(fach, seiteNummer) {
    try {
        // API Key zur Laufzeit laden
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('🔑 API Key für Lösungen:', apiKey ? `JA (${apiKey.substring(0, 20)}...)` : 'NEIN');

        if (!apiKey || apiKey === 'YOUR_NEW_GEMINI_API_KEY_HERE') {
            throw new Error('GEMINI_API_KEY nicht gesetzt! Bitte in .env Datei eintragen.');
        }

        // GenAI zur Laufzeit initialisieren
        const genAI = new GoogleGenerativeAI(apiKey);

        // Finde die entsprechende Buchseite in MEGA
        const file = await findBookPage(fach, seiteNummer);

        // Lade die Datei als Buffer herunter (für Discord)
        console.log('📥 Lade Originalbild herunter...');
        const imageBuffer = await file.downloadBuffer();

        // Führe OCR durch für die Textanalyse
        console.log('🔤 Führe OCR durch...');

        let text = '';
        try {
            text = await performOCRWithRetry(imageBuffer, 2);
        } catch (ocrError) {
            console.log('⚠️ OCR fehlgeschlagen, verwende Gemini Vision...');

            // Fallback: Verwende Gemini Vision für direkte Bildanalyse
            text = await analyzeImageWithGeminiVision(imageBuffer, genAI);
        }

        if (!text.trim()) {
            throw new Error('Kein Text in der Datei gefunden');
        }

        console.log('🤖 Sende an Gemini...');

        // Sende an Gemini zur Lösungsfindung
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = createSolutionPrompt(fach, seiteNummer, text);

        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;

        // Gib sowohl das Bild als auch die Lösung zurück
        return {
            imageBuffer: imageBuffer,
            fileName: file.name || `${fach}_seite_${seiteNummer}.jpg`,
            solution: geminiResponse.text()
        };

    } catch (error) {
        throw error;
    }
}

// Gemini Vision Fallback für OCR
async function analyzeImageWithGeminiVision(imageBuffer, genAI) {
    try {
        console.log('👁️ Verwende Gemini Vision für Textextraktion...');

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Konvertiere Bild zu Base64
        const base64Image = imageBuffer.toString('base64');

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
            }
        };

        const prompt = `
Extrahiere ALLEN sichtbaren Text aus diesem Bild einer Buchseite.

Aufgabe:
1. Erkenne und transkribiere JEDEN sichtbaren Text
2. Behalte die Struktur und Formatierung bei
3. Achte besonders auf Aufgabennummern und Inhalte
4. Gib den Text vollständig und strukturiert wieder

Bitte gib NUR den erkannten Text zurück, keine zusätzlichen Kommentare.
`;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;

        console.log('✅ Gemini Vision Textextraktion erfolgreich');
        return response.text();

    } catch (visionError) {
        console.error('❌ Gemini Vision fehlgeschlagen:', visionError);
        throw new Error('Sowohl OCR als auch Gemini Vision fehlgeschlagen');
    }
}

// Neue Funktion: Material-Dateien mit Bildern zurückgeben
export async function getMaterialWithImages(fach, seiteNummer) {
    try {
        // Finde alle Material-Dateien
        const files = await findMaterialFiles(fach, seiteNummer);

        const materialImages = [];

        // Lade alle Dateien herunter
        for (const file of files) {
            console.log(`📥 Lade Material-Datei herunter: ${file.name}`);
            const imageBuffer = await file.downloadBuffer();

            materialImages.push({
                imageBuffer: imageBuffer,
                fileName: file.name
            });
        }

        return materialImages;

    } catch (error) {
        throw error;
    }
}

function normalizeFach(fach) {
    const lowerFach = fach.toLowerCase();

    // Spezielle Mappings
    const mappings = {
        'franzoesisch': 'französisch',
        'fr': 'französisch',
        'religion ev': 'religion ev',
        'religion kt': 'religion kt'
    };

    return mappings[lowerFach] || lowerFach;
}

function createSolutionPrompt(fach, seiteNummer, text) {
    const fachSpezifisch = getFachSpezifischeAnweisungen(fach);

    return `
Du bist ein sehr hilfsbereiter Nachhilfe-Assistent für das Fach "${fach}". Analysiere den folgenden Text aus einem Schulbuch und löse alle Aufgaben, die du findest.

Text von Seite ${seiteNummer}:
${text}

${fachSpezifisch}

Aufgabe:
1. Identifiziere alle Übungen, Aufgaben und Fragen auf dieser Seite
2. Löse sie Schritt für Schritt
3. Erkläre deine Lösungswege verständlich und ausführlich
4. Gib praktische Tipps zum Verständnis

Format deine Antwort strukturiert:

## 📚 Aufgabe 1: [Aufgabentitel]
**Lösung:**
[Schritt-für-Schritt Lösung]

**Erklärung:**
[Verständliche Erklärung]

## 📚 Aufgabe 2: [Aufgabentitel]
**Lösung:**
[Schritt-für-Schritt Lösung]

**Erklärung:**
[Verständliche Erklärung]

Falls keine klaren Aufgaben erkennbar sind, fasse den Inhalt zusammen und gib Lernhilfen für das Thema.

Sei geduldig, motivierend und erkläre alles so, dass es ein Schüler gut verstehen kann.
`;
}

function getFachSpezifischeAnweisungen(fach) {
    const lowerFach = fach.toLowerCase();

    switch (lowerFach) {
        case 'mathe':
            return `
Spezielle Anweisungen für Mathematik:
- Zeige alle Rechenschritte deutlich
- Erkläre mathematische Konzepte und Formeln
- Gib Tipps für ähnliche Aufgaben
- Prüfe deine Ergebnisse`;

        case 'deutsch':
            return `
Spezielle Anweisungen für Deutsch:
- Erkläre Grammatikregeln und Rechtschreibung
- Gib Interpretationshilfen für Texte
- Erläutere Stilmittel und Textarten
- Hilf bei der Textanalyse`;

        case 'english':
            return `
Spezielle Anweisungen für Englisch:
- Gib Übersetzungen und Erklärungen
- Erkläre Grammatikregeln auf Deutsch
- Hilf bei Vokabeln und Phrasen
- Korrigiere Fehler und erkläre sie`;

        case 'französisch':
        case 'franzoesisch':
        case 'fr':
            return `
Spezielle Anweisungen für Französisch:
- Gib Übersetzungen ins Deutsche
- Erkläre französische Grammatik verständlich
- Hilf bei Aussprache und Vokabeln
- Erkläre kulturelle Besonderheiten`;

        case 'latein':
            return `
Spezielle Anweisungen für Latein:
- Übersetze lateinische Texte ins Deutsche
- Erkläre Grammatik und Syntax
- Gib Hilfen zur Wortschatzerweiterung
- Erkläre historische Zusammenhänge`;

        case 'geschichte':
            return `
Spezielle Anweisungen für Geschichte:
- Erkläre historische Zusammenhänge
- Gib Zeitleisten und Daten
- Erkläre Ursachen und Auswirkungen
- Verbinde Vergangenheit mit Gegenwart`;

        case 'physik':
            return `
Spezielle Anweisungen für Physik:
- Erkläre physikalische Gesetze und Formeln
- Zeige Berechnungen mit Einheiten
- Gib Alltagsbezug zu Phänomenen
- Erkläre Experimente und Versuche`;

        case 'chemie':
            return `
Spezielle Anweisungen für Chemie:
- Erkläre chemische Reaktionen und Formeln
- Zeige Berechnungen mit Molekülen
- Erkläre Periodensystem und Bindungen
- Gib Sicherheitshinweise bei Experimenten`;

        case 'religion ev':
        case 'religion kt':
        case 'ethik':
            return `
Spezielle Anweisungen für ${fach}:
- Erkläre ethische und religiöse Konzepte
- Gib verschiedene Sichtweisen wieder
- Erkläre Textinterpretationen
- Fördere kritisches Denken`;

        default:
            return `
Allgemeine Anweisungen:
- Gib ausführliche, korrekte Antworten
- Erkläre Fachbegriffe verständlich
- Strukturiere deine Antworten klar
- Motiviere zum Lernen`;
    }
}
