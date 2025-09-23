import fetch from 'node-fetch';
import { config } from 'dotenv';
import sharp from 'sharp';

config();

export async function performOCR(imageBuffer) {
    try {
        const apiKey = process.env.OCR_API_KEY;

        if (!apiKey || apiKey === 'helloworld') {
            console.log('⚠️  OCR.space API Key nicht gesetzt, verwende Fallback OCR...');
            return await performFallbackOCR(imageBuffer);
        }

        console.log('🔤 Verwende OCR.space für Texterkennung...');

        // Optimiere Bild mit Sharp für bessere OCR Ergebnisse
        const optimizedBuffer = await optimizeImageForOCR(imageBuffer);

        // Konvertiere Buffer zu Base64
        const base64Image = optimizedBuffer.toString('base64');

        const formData = new URLSearchParams();
        formData.append('apikey', apiKey);
        formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
        formData.append('language', 'ger'); // Deutsch
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2'); // Engine 2 ist oft besser
        formData.append('isTable', 'true'); // Bessere Tabellenerkennung

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            timeout: 30000 // 30 Sekunden Timeout
        });

        const result = await response.json();

        if (result.OCRExitCode === 1 && result.ParsedResults && result.ParsedResults.length > 0) {
            const extractedText = result.ParsedResults[0].ParsedText;
            console.log('✅ OCR.space erfolgreich:', extractedText.substring(0, 100) + '...');
            return extractedText;
        } else {
            throw new Error(`OCR.space Fehler: ${result.ErrorMessage || 'Unbekannter Fehler'}`);
        }

    } catch (error) {
        console.error('❌ OCR.space Fehler:', error.message);
        console.log('🔄 Verwende Fallback OCR...');
        return await performFallbackOCR(imageBuffer);
    }
}

// Bild für OCR optimieren mit Sharp
async function optimizeImageForOCR(imageBuffer) {
    try {
        console.log('🖼️ Optimiere Bild für OCR...');

        const optimized = await sharp(imageBuffer)
            .resize(2000, 2000, { // Maximale Größe für bessere OCR
                fit: 'inside',
                withoutEnlargement: true
            })
            .greyscale() // Konvertiere zu Graustufen
            .normalize() // Verbessere Kontrast
            .sharpen() // Schärfe das Bild
            .jpeg({ quality: 90 }) // Hohe Qualität JPEG
            .toBuffer();

        console.log('✅ Bildoptimierung abgeschlossen');
        return optimized;
    } catch (error) {
        console.log('⚠️ Bildoptimierung fehlgeschlagen, verwende Original:', error.message);
        return imageBuffer;
    }
}

// Fallback OCR ohne Tesseract.js (Bun-kompatibel)
async function performFallbackOCR(imageBuffer) {
    try {
        console.log('🔄 Starte Enhanced Fallback OCR...');

        // Verwende kostenlosen OCR.space Service
        const base64Image = imageBuffer.toString('base64');

        const formData = new URLSearchParams();
        formData.append('apikey', 'helloworld'); // Kostenloser API Key
        formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
        formData.append('language', 'ger');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '1'); // Engine 1 für kostenlosen Service

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            timeout: 45000 // Längerer Timeout für kostenlosen Service
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.OCRExitCode === 1 && result.ParsedResults && result.ParsedResults.length > 0) {
            const extractedText = result.ParsedResults[0].ParsedText;
            console.log('✅ Fallback OCR erfolgreich');
            return extractedText;
        } else {
            throw new Error(`Fallback OCR Fehler: ${result.ErrorMessage || 'Unbekannter Fehler'}`);
        }

    } catch (fallbackError) {
        console.error('❌ Auch Fallback OCR fehlgeschlagen:', fallbackError);
        return generateBasicOCRResult();
    }
}

// Letzter Fallback - Generiere hilfreiche Fehlermeldung
function generateBasicOCRResult() {
    console.log('🆘 Verwende Basic OCR Fallback...');

    const basicResult = `
❌ Automatische Texterkennung fehlgeschlagen

Mögliche Lösungen:
1. 🔑 OCR.space API Key in .env eintragen: OCR_API_KEY=dein_key
2. 📸 Bessere Bildqualität verwenden (höhere Auflösung, guter Kontrast)
3. 🔤 Text manuell mit .ai command eingeben

Beispiele für manuelle Eingabe:
• .ai Erkläre Aufgabe: [Text der Aufgabe hier eingeben]
• .ai Hilf mir bei Mathe: [Aufgabenstellung hier eingeben]

🌐 Kostenlosen OCR.space API Key holen:
https://ocr.space/ocrapi (kostenlos für 25.000 Anfragen/Monat)
`;

    console.log('⚠️  Basic OCR Fallback verwendet - limitierte Funktionalität');
    return basicResult;
}

// Utility Funktion für URL-basierte OCR
export async function performOCRFromURL(imageUrl) {
    try {
        console.log('📥 Lade Bild von URL herunter...');
        const response = await fetch(imageUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Discord-Bot/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const imageBuffer = await response.arrayBuffer();
        console.log(`📊 Bildgröße: ${Math.round(imageBuffer.byteLength / 1024)} KB`);

        // Validiere Bild
        validateImage(Buffer.from(imageBuffer));

        return await performOCR(Buffer.from(imageBuffer));
    } catch (error) {
        throw new Error(`Fehler beim Laden des Bildes von URL: ${error.message}`);
    }
}

// Funktion zur Bildvalidierung
export function validateImage(imageBuffer) {
    const maxSize = 10 * 1024 * 1024; // 10MB Limit
    const minSize = 1024; // 1KB Minimum

    if (imageBuffer.length > maxSize) {
        throw new Error('Bild ist zu groß (max. 10MB)');
    }

    if (imageBuffer.length < minSize) {
        throw new Error('Bild ist zu klein (min. 1KB)');
    }

    // Prüfe ob es sich um ein gültiges Bildformat handelt
    const header = imageBuffer.slice(0, 8);
    const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    const isWEBP = header.slice(0, 4).toString() === 'RIFF' && header.slice(8, 12).toString() === 'WEBP';

    if (!isPNG && !isJPEG && !isWEBP) {
        throw new Error('Unsupported image format. Only PNG, JPEG and WEBP are supported.');
    }

    return true;
}

// Enhanced OCR with retry logic
export async function performOCRWithRetry(imageBuffer, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 OCR Versuch ${attempt}/${maxRetries}`);
            const result = await performOCR(imageBuffer);

            // Prüfe ob Ergebnis sinnvoll ist
            if (result && result.trim().length > 10) {
                return result;
            } else {
                throw new Error('OCR Ergebnis zu kurz oder leer');
            }
        } catch (error) {
            console.log(`❌ OCR Versuch ${attempt} fehlgeschlagen:`, error.message);

            if (attempt === maxRetries) {
                throw error;
            }

            // Warte zwischen Versuchen
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}
