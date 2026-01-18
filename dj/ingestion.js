// Imports:
import fs from "fs";
import path from "path";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const pdf = require("pdf-parse");

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

// Function to transform PDF files (For now only works for text-based PDFs)
async function transformPDF(userInput) {
    console.log("Transforming PDF...", userInput);

    const buffer = fs.readFileSync(userInput); // read file into memory

    const data = await pdf(buffer);        // pdf-parse parses the PDF buffer

    const text = data.text?.trim() || "";
    const isScanned = text.length < 50;

    return {
        source: path.basename(userInput),
        type: "document",
        content: isScanned ? null : text,
        extraction: isScanned ? "image" : "text",
        note: isScanned ? "PDF appears to be scanned. Text extraction failed." : null
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
