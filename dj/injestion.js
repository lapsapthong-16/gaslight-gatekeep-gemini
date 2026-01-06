import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { parse } from "csv-parse/sync";

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

    // Notify user regarding the wrong file type
    throw new Error("Unsupported file type: " + filetype);
}

// Function to transform PDF files
async function transformPDF(userInput) {
    console.log("Transforming PDF...", userInput);
    const buffer = fs.readFileSync(userInput);
    const data = await pdf(buffer)
    return {
        source: path.basename(userInput),
        type: "document",
        content: data.text
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