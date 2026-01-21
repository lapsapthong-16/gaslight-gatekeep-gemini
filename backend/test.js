import { ingestFile } from "./ingestion.js";

async function runTests() {
    try {
        console.log("Starting Test...");

        // Testing with Video Game Sales dataset
        const filePath = "./backend/vgsales.csv";

        const result = await ingestFile(filePath);

        // Created a "Summary" version just for printing to the screen
        const cleanResult = {
            ...result,
            raw_data: result.raw_data ? {
                mimeType: result.raw_data.mimeType,
                // Truncate only the display string
                data: result.raw_data.data.substring(0, 50) + "... [DATA TRUNCATED]"
            } : null
        };

        console.log("Success! Resulting Data:");
        // Log the "clean" version instead of the "heavy" version
        console.log(JSON.stringify(cleanResult, null, 2));

        // NOTE: 'result.raw_data.data' still contains the full 100% file content!
    } catch (error) {
        console.error("Test Failed!");
        console.error(error.message);
    }
}

runTests();
