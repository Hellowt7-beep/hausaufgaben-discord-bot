import { GoogleGenerativeAI } from '@google/generative-ai';
import { Storage } from 'megajs';
import Tesseract from 'tesseract.js';
import { config } from 'dotenv';

// Stelle sicher, dass .env geladen wird
config();

let megaStorage = null;

async function connectToMega() {
    if (megaStorage) return megaStorage;

    try {
        if (!process.env.MEGA_EMAIL || !process.env.MEGA_PASSWORD) {
            throw new Error('MEGA Login-Daten fehlen in .env Datei');
        }

        megaStorage = new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD
        });
        await megaStorage.ready;
        return megaStorage;
    } catch (error) {
        throw new Error('MEGA Verbindung fehlgeschlagen. Prüfe deine Login-Daten.');
    }
}

async function findBookPage(fach, seiteNummer) {
    const storage = await connectToMega();

    // Suche nach Datei mit Pattern: fach_seite_nummer
    const fileName = `${fach}_seite_${seiteNummer}`;

    // Durchsuche alle Dateien
    const files = storage.files;
    const foundFile = Object.values(files).find(file => {
        const name = file.name?.toLowerCase();
        return name && (
            name.includes(fileName.toLowerCase()) ||
            name.includes(`${fach.toLowerCase()}_${seiteNummer}`) ||
            name.includes(`${fach.toLowerCase()}_seite_${seiteNummer}`)
        );
    });

    if (!foundFile) {
        throw new Error(`Datei nicht gefunden: ${fileName}(.jpg/.png/.pdf)`);
    }

    return foundFile;
}

async function downloadAndProcessImage(file) {
    try {
        // Datei als Buffer herunterladen
        const data = await file.downloadBuffer();

        // OCR auf dem Bild
        const { data: { text } } = await Tesseract.recognize(data, 'deu+eng');

        if (!text.trim()) {
            throw new Error('Kein Text in der Datei gefunden');
        }

        return text;

    } catch (error) {
        throw new Error(`Dateiverarbeitung fehlgeschlagen: ${error.message}`);
    }
}

export async function findHomeworkInMega() {
    try {
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

        // Lade die Datei direkt als Buffer herunter
        const imageBuffer = await foundFile.downloadBuffer();

        // Erstelle einen data URL für Tesseract
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

        const prompt = `
Du bist ein sehr hilfsbereiter Nachhilfe-Assistent. Analysiere den folgenden Text aus einem Schulbuch für das Fach "${fach}" und löse alle Aufgaben, die du findest.

Text von Seite ${seiteNummer}:
${extractedText}

Aufgabe:
1. Identifiziere alle Übungen, Aufgaben und Fragen auf dieser Seite
2. Löse sie Schritt für Schritt
3. Erkläre deine Lösungswege verständlich
4. Bei Mathe: Zeige alle Rechenschritte
5. Bei Sprachen: Gib Übersetzungen und Erklärungen
6. Bei anderen Fächern: Gib ausführliche, korrekte Antworten

Format deine Antwort strukturiert:

## Aufgabe 1: [Aufgabe]
**Lösung:** [Schritt-für-Schritt Lösung]

## Aufgabe 2: [Aufgabe]
**Lösung:** [Schritt-für-Schritt Lösung]

Falls keine klaren Aufgaben erkennbar sind, fasse den Inhalt zusammen und gib Lernhilfen.
`;

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
        const { data: { text } } = await Tesseract.recognize(imageBuffer, 'deu+eng');

        if (!text.trim()) {
            throw new Error('Kein Text in der Datei gefunden');
        }

        console.log('🤖 Sende an Gemini...');

        // Sende an Gemini zur Lösungsfindung
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Du bist ein sehr hilfsbereiter Nachhilfe-Assistent. Analysiere den folgenden Text aus einem Schulbuch für das Fach "${fach}" und löse alle Aufgaben, die du findest.

Text von Seite ${seiteNummer}:
${text}

Aufgabe:
1. Identifiziere alle Übungen, Aufgaben und Fragen auf dieser Seite
2. Löse sie Schritt für Schritt
3. Erkläre deine Lösungswege verständlich
4. Bei Mathe: Zeige alle Rechenschritte
5. Bei Sprachen (Deutsch, English, Latein, Französisch): Gib Übersetzungen und Erklärungen
6. Bei anderen Fächern: Gib ausführliche, korrekte Antworten

Format deine Antwort strukturiert:

## Aufgabe 1: [Aufgabe]
**Lösung:** [Schritt-für-Schritt Lösung]

## Aufgabe 2: [Aufgabe]
**Lösung:** [Schritt-für-Schritt Lösung]

Falls keine klaren Aufgaben erkennbar sind, fasse den Inhalt zusammen und gib Lernhilfen.
`;

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
