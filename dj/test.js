import { ingestFile } from "./ingestion.js";

async function runTests() {
    try {
        console.log("Starting Test...");

        // Trying CSV - WORKS!
        // const filePath = "C:/Users/Joon/Downloads/archive (4)/November Sleep Data - Sheet1.csv";

        // Trying Excel - WORKS!
        // const filePath = "C:/Users/Joon/Downloads/Coca Cola Co.xlsx";

        // Trying PDF (TEXT) - WORKS!
        // const filePath = "C:/Users/Joon/Downloads/trial.pdf"; // Text only
        // const filePath = "C:/Users/Joon/Downloads/trial-image.pdf"; // Image only
        // Mixed PDF - WORKS!
        const filePath = "C:/Users/Joon/Downloads/Boukhayma_3D_Hand_Shape_and_Pose_From_Images_in_the_Wild_CVPR_2019_paper.pdf"; // Mixed

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
