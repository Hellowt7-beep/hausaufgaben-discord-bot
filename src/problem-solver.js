import { GoogleGenerativeAI } from '@google/generative-ai';
import { Storage } from 'megajs';
import { config } from 'dotenv';
import { performOCR } from './ocr-service.js';

// Stelle sicher, dass .env geladen wird
config();

let megaStorage = null;

export async function connectToMega() {
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

export async function findBookPage(fach, seiteNummer) {
    const storage = await connectToMega();

    console.log(`🔍 Suche nach: ${fach} Seite ${seiteNummer}`);

    // Durchsuche alle Dateien mit präziser Suche
    const files = storage.files;
    const foundFile = Object.values(files).find(file => {
        const name = file.name?.toLowerCase();
        if (!name) return false;

        // Entferne Dateiendung für besseren Vergleich
        const nameWithoutExt = name.replace(/\.(jpg|png|jpeg|pdf)$/i, '');
        const fachLower = fach.toLowerCase();
        const seiteStr = seiteNummer.toString();

        // Erstelle exakte Patterns für verschiedene Namenskonventionen
        const exactPatterns = [
            `^${fachLower}_seite_${seiteStr}$`,
            `^${fachLower}_${seiteStr}$`,
            `^${fachLower}seite${seiteStr}$`,
            `^${fachLower}_s${seiteStr}$`,
            `^${fachLower}_page_${seiteStr}$`
        ];

        // Prüfe auf exakte Matches
        const isExactMatch = exactPatterns.some(pattern => {
            const regex = new RegExp(pattern, 'i');
            return regex.test(nameWithoutExt);
        });

        if (isExactMatch) {
            console.log(`✅ Exakter Match gefunden: ${name}`);
            return true;
        }

        // Fallback: Prüfe ob Dateiname das Fach enthält und dann die exakte Seitennummer
        if (nameWithoutExt.includes(fachLower)) {
            // Extrahiere alle Zahlen aus dem Dateinamen
            const numbers = nameWithoutExt.match(/\d+/g) || [];

            // Prüfe ob die exakte Seitennummer als eigenständige Zahl vorkommt
            const hasExactNumber = numbers.includes(seiteStr);

            // Zusätzlich prüfen: Steht die Zahl an der richtigen Position?
            const hasCorrectPosition = nameWithoutExt.match(new RegExp(`(seite|page|s)_?${seiteStr}(?!\\d)`, 'i')) ||
                                     nameWithoutExt.match(new RegExp(`${fachLower}_${seiteStr}(?!\\d)`, 'i'));

            if (hasExactNumber && hasCorrectPosition) {
                console.log(`✅ Fallback Match gefunden: ${name} (Zahlen: [${numbers.join(', ')}])`);
                return true;
            } else if (hasExactNumber) {
                console.log(`⚠️ Zahl gefunden aber falsche Position: ${name} (Zahlen: [${numbers.join(', ')}])`);
            }
        }

        return false;
    });

    if (!foundFile) {
        console.log('❌ Verfügbare Dateien für', fach + ':');
        Object.values(files).forEach(file => {
            if (file.name?.toLowerCase().includes(fach.toLowerCase())) {
                console.log(`   📄 ${file.name}`);
            }
        });
        throw new Error(`Datei nicht gefunden für: ${fach} Seite ${seiteNummer}

Erwartete Dateiformate:
• ${fach}_seite_${seiteNummer}.jpg/.png
• ${fach}_${seiteNummer}.jpg/.png

Stelle sicher, dass die Datei in MEGA hochgeladen ist.`);
    }

    console.log(`✅ Gefunden: ${foundFile.name}`);
    return foundFile;
}

export async function downloadAndProcessImage(file) {
    try {
        // Datei als Buffer herunterladen
        const data = await file.downloadBuffer();

        // OCR auf dem Bild
        const text = await performOCR(data);

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

        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            throw new Error('GEMINI_API_KEY nicht gesetzt! Bitte in .env Datei eintragen.');
        }

        // GenAI zur Laufzeit initialisieren
        const genAI = new GoogleGenerativeAI(apiKey);

        // Finde die entsprechende Buchseite in MEGA
        const file = await findBookPage(fach, seiteNummer);

        // Lade die Datei herunter und führe OCR durch
        const extractedText = await downloadAndProcessImage(file);

        // Sende an Gemini zur Lösungsfindung - KORRIGIERTER MODEL NAME
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
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
        const text = await performOCR(imageBuffer);

        if (!text.trim()) {
            throw new Error('Kein Text in der Datei gefunden');
        }

        console.log('🤖 Sende an Gemini 2.5 Flash...');

        // Sende an Gemini zur Lösungsfindung - KORRIGIERTER MODEL NAME
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

export async function getMaterialWithImages(fach, material) {
    try {
        // API Key zur Laufzeit laden
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('🔑 API Key für Material:', apiKey ? `JA (${apiKey.substring(0, 20)}...)` : 'NEIN');

        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            throw new Error('GEMINI_API_KEY nicht gesetzt! Bitte in .env Datei eintragen.');
        }

        // GenAI zur Laufzeit initialisieren
        const genAI = new GoogleGenerativeAI(apiKey);

        // Finde das entsprechende Material in MEGA
        const storage = await connectToMega();
        const files = storage.files;

        const foundFiles = Object.values(files).filter(file => {
            const name = file.name?.toLowerCase();
            if (!name) return false;

            const fachLower = fach.toLowerCase();
            const materialLower = material.toLowerCase();

            return name.includes(fachLower) && name.includes(materialLower);
        });

        if (foundFiles.length === 0) {
            throw new Error(`Material nicht gefunden für: ${fach} - ${material}`);
        }

        console.log(`📚 ${foundFiles.length} Material-Dateien gefunden`);

        // Verarbeite alle gefundenen Dateien
        const materialResults = [];

        for (const file of foundFiles) {
            try {
                // Lade die Datei als Buffer herunter
                console.log(`📥 Lade Material: ${file.name}...`);
                const imageBuffer = await file.downloadBuffer();

                // Führe OCR durch für die Textanalyse
                console.log('🔤 Führe OCR durch...');
                const text = await performOCR(imageBuffer);

                if (text.trim()) {
                    console.log('🤖 Sende an Gemini 2.5 Flash...');

                    // Sende an Gemini zur Materialanalyse - KORRIGIERTER MODEL NAME
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                    const prompt = `
Du bist ein hilfreicher Lern-Assistent. Analysiere das folgende Material aus dem Fach "${fach}" und bereite es für das Lernen auf.

Material: ${material}
Text:
${text}

Aufgabe:
1. Fasse den Inhalt strukturiert zusammen
2. Erkläre wichtige Konzepte verständlich
3. Erstelle Lernhilfen und Merksätze
4. Bei Formeln: Erkläre deren Anwendung
5. Bei Texten: Gib eine Zusammenfassung

Format deine Antwort strukturiert und lernfreundlich.
`;

                    const result = await model.generateContent(prompt);
                    const geminiResponse = await result.response;

                    materialResults.push({
                        imageBuffer: imageBuffer,
                        fileName: file.name || `${fach}_${material}.jpg`,
                        analysis: geminiResponse.text()
                    });
                } else {
                    // Auch ohne OCR Text das Bild hinzufügen
                    materialResults.push({
                        imageBuffer: imageBuffer,
                        fileName: file.name || `${fach}_${material}.jpg`,
                        analysis: `Material-Datei: ${file.name}\n(Kein Text erkannt - nur Bild verfügbar)`
                    });
                }
            } catch (fileError) {
                console.log(`⚠️ Fehler bei Datei ${file.name}:`, fileError.message);
                continue;
            }
        }

        return materialResults;

    } catch (error) {
        throw error;
    }
}
