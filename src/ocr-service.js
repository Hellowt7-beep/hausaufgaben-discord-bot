import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

export async function performOCR(imageBuffer) {
    try {
        const apiKey = process.env.OCR_API_KEY;

        if (!apiKey || apiKey === 'helloworld') {
            console.log('⚠️  OCR.space API Key nicht gesetzt, verwende Fallback OCR...');
            // Fallback zu einer einfachen Texterkennung
            return await fallbackOCR(imageBuffer);
        }

        // Konvertiere Buffer zu Base64
        const base64Image = imageBuffer.toString('base64');

        const formData = new URLSearchParams();
        formData.append('apikey', apiKey);
        formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
        formData.append('language', 'ger'); // Deutsch
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2'); // Engine 2 ist oft besser

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
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
        return await fallbackOCR(imageBuffer);
    }
}

async function fallbackOCR(imageBuffer) {
    try {
        // Dynamischer Import von Tesseract als Fallback
        const Tesseract = await import('tesseract.js');
        const { data: { text } } = await Tesseract.default.recognize(imageBuffer, 'deu+eng');
        console.log('✅ Fallback OCR (Tesseract) erfolgreich');
        return text;
    } catch (fallbackError) {
        throw new Error('Sowohl OCR.space als auch Fallback OCR fehlgeschlagen');
    }
}

// Utility Funktion für URL-basierte OCR
export async function performOCRFromURL(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const imageBuffer = await response.arrayBuffer();
        return await performOCR(Buffer.from(imageBuffer));
    } catch (error) {
        throw new Error(`Fehler beim Laden des Bildes: ${error.message}`);
    }
}
