import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ingestFile } from "./ingestion.js";

// --- SETUP DOTENV FOR SUBFOLDER ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, ".env") });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runGeminiTest(filePath) {
    try {
        console.log(`\n📂 Loading file: ${path.basename(filePath)}`);

        // 1. GET DATA FROM YOUR INGESTION SCRIPT
        const fileData = await ingestFile(filePath);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 2. DECIDE THE FORMAT (The "Merge")
        let promptParts = [];

        if (fileData.extraction === "mixed" || fileData.extraction === "image_only") {
            // MULTIMODAL MODE: Sends both text and the original PDF bytes
            console.log("🛠️ Mode: Multimodal (Text + Vision)");
            promptParts = [
                { text: "Describe this document. Pay close attention to any charts or images." },
                {
                    inlineData: {
                        mimeType: fileData.raw_data.mimeType,
                        data: fileData.raw_data.data // This is your Base64 string
                    }
                }
            ];
        } else {
            // TEXT MODE: Sends only the cleaned JSON/Text
            console.log("🛠️ Mode: Text/Tabular");
            promptParts = [
                { text: `Analyze this data and give a summary: ${JSON.stringify(fileData.content)}` }
            ];
        }

        // 3. SEND TO GEMINI
        console.log("🚀 Sending to Gemini...");
        const result = await model.generateContent(promptParts);

        console.log("\n--- [ GEMINI RESPONSE ] ---");
        console.log(result.response.text());
        console.log("---------------------------\n");

    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
}

// --- RUN THE TEST ---
// Change this to test different files (CSV, Excel, or PDF)
runGeminiTest("C:/Users/Joon/Downloads/Boukhayma_3D_Hand_Shape_and_Pose_From_Images_in_the_Wild_CVPR_2019_paper.pdf");