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

// Function to transform PDF files
async function transformPDF(userInput) {
    console.log("Analyzing PDF structure...", userInput);

    const data = new Uint8Array(fs.readFileSync(userInput));
    const loadingTask = pdfjs.getDocument({ data, verbosity: 0 });

    const pdfDocument = await loadingTask.promise;

    let totalText = "";
    let imageCount = 0;

    // Loop through every page to inspect its contents
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);

        // 1. Extract Text
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        totalText += pageText + "\n";

        // 2. Look for Image Objects (The accurate way)
        const operatorList = await page.getOperatorList();

        // We look for specific "Paint Image" commands in the PDF's internal code
        const hasImagesOnPage = operatorList.fnArray.some(
            fn => fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject
        );

        if (hasImagesOnPage) imageCount++;
    }

    // --- The Logic for Categorization ---
    const hasSignificantText = totalText.trim().length > 50;
    const hasImages = imageCount > 0;

    let category = "";
    if (hasSignificantText && hasImages) {
        category = "mixed";
    } else if (hasSignificantText && !hasImages) {
        category = "text_only";
    } else if (!hasSignificantText && hasImages) {
        category = "image_only"; // This is a classic scanned document
    } else {
        category = "empty_or_vector"; // Likely just shapes or empty
    }

    return {
        source: path.basename(userInput),
        type: "document",
        pages: pdfDocument.numPages,
        content: totalText.trim(),
        extraction: category,
        image_detected: hasImages,
        note: category === "image_only" ? "Document is a scan. Need to send images to Gemini." : null
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
