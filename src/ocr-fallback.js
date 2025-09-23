import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

// Fallback OCR wenn Tesseract.js nicht funktioniert
export async function performFallbackOCR(imageBuffer) {
    try {
        console.log('🔄 Verwende OCR.space als Fallback...');

        const apiKey = process.env.OCR_API_KEY;

        // Wenn kein OCR.space API Key, verwende kostenlosen Service
        if (!apiKey || apiKey === 'helloworld') {
            console.log('⚠️  Kein OCR.space API Key - verwende Basic OCR...');
            return performBasicOCR(imageBuffer);
        }

        // Konvertiere Buffer zu Base64
        const base64Image = imageBuffer.toString('base64');

        const formData = new URLSearchParams();
        formData.append('apikey', apiKey);
        formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
        formData.append('language', 'ger');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2');

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            timeout: 30000
        });

        const result = await response.json();

        if (result.OCRExitCode === 1 && result.ParsedResults && result.ParsedResults.length > 0) {
            const extractedText = result.ParsedResults[0].ParsedText;
            console.log('✅ OCR.space Fallback erfolgreich');
            return extractedText;
        } else {
            throw new Error(`OCR.space Fehler: ${result.ErrorMessage || 'Unbekannter Fehler'}`);
        }

    } catch (error) {
        console.error('❌ OCR.space Fallback fehlgeschlagen:', error.message);
        return performBasicOCR(imageBuffer);
    }
}

// Sehr einfacher OCR Fallback (nur für Notfälle)
function performBasicOCR(imageBuffer) {
    console.log('🔄 Verwende Basic OCR Fallback...');

    // Simuliere OCR Ergebnis für Demo/Testing
    const basicResult = `
Hausaufgaben erkannt (Basic OCR):

Deutsch:
- Bitte Text manuell eingeben oder bessere OCR verwenden

Mathe:
- Bitte Text manuell eingeben oder bessere OCR verwenden

Hinweis: Für bessere Texterkennung:
1. OCR.space API Key in .env eintragen
2. Oder: Tesseract.js reparieren
3. Oder: Text manuell mit .ai command eingeben
`;

    console.log('⚠️  Basic OCR verwendet - limitierte Funktionalität');
    return basicResult;
}

// Windows-kompatible Tesseract Alternative
export async function performWindowsOCR(imageBuffer) {
    try {
        console.log('🪟 Versuche Windows-kompatible OCR...');

        // Verwende dynamischen Import für bessere Kompatibilität
        const Tesseract = await import('tesseract.js');

        // Konfiguration für Windows
        const workerOptions = {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`🔤 OCR: ${Math.round(m.progress * 100)}%`);
                }
            },
            // Windows-spezifische Optionen
            cacheMethod: 'refresh',
            gzipURL: false,
            maxWorkers: 1
        };

        const { data: { text } } = await Tesseract.default.recognize(imageBuffer, 'deu+eng', workerOptions);

        console.log('✅ Windows OCR erfolgreich');
        return text;

    } catch (error) {
        console.error('❌ Windows OCR fehlgeschlagen:', error.message);
        throw error;
    }
}
