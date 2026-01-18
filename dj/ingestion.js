// Imports:
import fs from "fs";
import path from "path";

// Using pdfjs-dist
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
if (!pdfjs.GlobalWorkerOptions.workerPort) {
    pdfjs.GlobalWorkerOptions.workerPort = null;
}

import { parse } from "csv-parse/sync";
import XLSX from "xlsx";

// 'export' allow other scripts to use the function
export async function ingestFile(userInput) {
    // Check if file exists
    if (!fs.existsSync(userInput)) {
        throw new Error(`File not found at path: ${userInput}`);
    }

    // Retrieve the file type for rerouting option
    const filetype = path.extname(userInput).toLowerCase();

    if (filetype === ".pdf") {
        return await transformPDF(userInput);
    }

    if (filetype === ".csv") {
        return transformCSV(userInput);
    }

    // 2 types of Excel file formats
    if (filetype == ".xlsx" || filetype == ".xls") {
        return transformExcel(userInput);
    }

    // Notify user regarding the wrong file type
    throw new Error(`Unsupported file type: ${filetype}`);
}


//TODO: Replace the current code with the one in Gemini <<<<<<<<<
// Function to transform PDF files
async function transformPDF(userInput) {
    console.log("Analyzing PDF for Gemini...", userInput);

    // 1. Read the file into a Buffer
    const fileBuffer = fs.readFileSync(userInput);

    // 2. Structural Analysis (Keeping your current logic)
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfjs.getDocument({ data, verbosity: 0 });
    const pdfDocument = await loadingTask.promise;

    let totalText = "";
    let imageCount = 0;

    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        totalText += pageText + "\n";

        const operatorList = await page.getOperatorList();
        const hasImagesOnPage = operatorList.fnArray.some(
            fn => fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject
        );
        if (hasImagesOnPage) imageCount++;
    }

    const hasSignificantText = totalText.trim().length > 50;
    const hasImages = imageCount > 0;

    let category = "";
    if (hasSignificantText && hasImages) category = "mixed";
    else if (hasSignificantText && !hasImages) category = "text_only";
    else if (!hasSignificantText && hasImages) category = "image_only";
    else category = "empty_or_vector";

    // 3. Return the data optimized for Gemini
    return {
        source: path.basename(userInput),
        type: "document",
        pages: pdfDocument.numPages,
        content: totalText.trim(), // Useful for searching or local logic
        extraction: category,
        image_detected: hasImages,
        // This is the "Secret Sauce" for Gemini Vision
        raw_data: {
            mimeType: "application/pdf",
            data: fileBuffer.toString("base64")
        },
        note: category === "image_only" ? "Scanned PDF detected. Gemini Vision will handle OCR." : null
    };
}

// Function to transform CSV files
function transformCSV(userInput) {
    console.log("Transforming CSV...", userInput);
    const rawfile = fs.readFileSync(userInput);
    const results = parse(rawfile, {
        columns: true,
        skip_empty_lines: true,
    });

    return {
        source: path.basename(userInput),
        type: "tabular",
        content: results,
        extraction: "text"
    };
}

// Function to transform Excel files
function transformExcel(userInput) {
    console.log("Transforming Excel...", userInput);

    const workbook = XLSX.readFile(userInput);
    const sheetName = workbook.SheetNames[0];  // As of now only retrieve the first sheet from the Excel file
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return {
        source: path.basename(userInput),
        type: "tabular",
        content: data,
        extraction: "text"
    };
}
