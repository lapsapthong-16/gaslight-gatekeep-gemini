import { ingestFile } from "./ingestion.js";

async function runTests() {
    try {
        console.log("Starting Test...");

        // Trying CSV - WORKS!
        // const filePath = "C:/Users/Joon/Downloads/archive (4)/November Sleep Data - Sheet1.csv";

        // Trying Excel - WORKS!
        // const filePath = "C:/Users/Joon/Downloads/Coca Cola Co.xlsx";

        // Trying PDF (TEXT) - WORKS!
        // const filePath = "C:/Users/Joon/Downloads/trial.pdf";

        const result = await ingestFile(filePath);

        console.log("Success! Resulting Data:");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Test Failed!");
        console.error(error.message);
    }
}

runTests();
