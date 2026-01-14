import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

// 'export' allow other scripts to use the function
export async function ingestFile(userInput) {
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
    throw new Error("Unsupported file type: " + filetype);
}

// Function to transform PDF files (For now only works for text-based PDFs)
async function transformPDF(userInput) {
    console.log("Transforming PDF...", userInput);
    const buffer = fs.readFileSync(userInput);
    const data = await pdf(buffer)
    const text = data.text?.trim() || "";

    if (text.length < 50) {
        return {
            source: path.basename(userInput),
            type: "document",
            content: null,
            extraction: "image",
            note: "PDF appears to be scanned. Text extraction failed."
        };
    }

    return {
        source: path.basename(userInput),
        type: "document",
        content: text,
        extraction: "text"
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
        content: results
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
        content: data
    };
}


//Tip: If the PDF has scanned images, you utilize Gemini Vision (pass the image directly) instead of trying to OCR it yourself.