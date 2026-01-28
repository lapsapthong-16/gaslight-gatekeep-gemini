import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- SETUP DOTENV ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from backend/.env first, then root .env
const backendEnvPath = path.resolve(__dirname, ".env");
const rootEnvPath = path.resolve(__dirname, "..", ".env");

if (fs.existsSync(backendEnvPath)) {
    config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
    config({ path: rootEnvPath });
} else {
    config(); // Default behavior
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey.includes("your-api-key") || apiKey === "") {
    console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is missing or invalid in .env");
    console.error("Please add your key to a .env file in the root or backend directory.");
    process.exit(1); // Exit early if we can't authenticate
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * ModelGateway handles clean, structured calls to Gemini.
 */
export class ModelGateway {
    constructor(modelName = "gemini-2.0-flash") {
        // Updated to use gemini-2.0-flash as 1.5-flash was reported missing.
        // Other available options: gemini-flash-latest, gemini-pro-latest
        this.model = genAI.getGenerativeModel({ model: modelName });
    }

    /**
     * Generates structured content from a prompt, with a single retry-and-repair for JSON malformation.
     * @param {string} prompt - The prompt to send.
     * @param {boolean} forceJson - Whether to force JSON output.
     */
    async generateStructuredContent(prompt, forceJson = true) {
        const generationConfig = {
            temperature: 0.2, // Low temp for more deterministic output
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 2048,
            responseMimeType: forceJson ? "application/json" : "text/plain",
        };

        try {
            console.log("🚀 Calling Gemini Gateway...");
            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig,
            });

            const responseText = result.response.text();

            if (forceJson) {
                try {
                    return JSON.parse(responseText);
                } catch (parseError) {
                    console.warn("⚠️ Malformed JSON detected. Retrying with repair prompt...");
                    return await this.repairJson(responseText, prompt);
                }
            }
            return responseText;

        } catch (error) {
            console.error("❌ Gateway Error:", error.message);
            throw error;
        }
    }

    /**
     * Simple one-time repair for malformed JSON.
     */
    async repairJson(originalOutput, originalPrompt) {
        const repairPrompt = `
        The following text was intended to be valid JSON but failed to parse. 
        Please fix it and return ONLY the valid JSON. No markdown, no explanations.

        Original Output:
        ${originalOutput}
        `;

        const result = await this.model.generateContent({
            contents: [{ role: "user", parts: [{ text: repairPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const repairedText = result.response.text();
        try {
            return JSON.parse(repairedText);
        } catch (finalError) {
            throw new Error("Failed to repair malformed JSON response from Gemini.");
        }
    }
}
