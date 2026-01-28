import { NextRequest, NextResponse } from "next/server";
import { ModelGateway } from "@/backend/gateway";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const { topic } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "No topic provided" }, { status: 400 });
        }

        // 1. One-Shot Boardroom Simulation
        const gateway = new ModelGateway("gemini-2.5-flash");
        
        const systemPrompt = `
You are a simulation engine for a Venture Capital Boardroom. 
You must simulate a heated, high-stakes debate between three specific characters regarding the following topic:
TOPIC: ${topic}

The Characters:
1. The Bull: Aggressive, loves risk, shouts, obsessed with 'alpha' and 'dominance'. (Color: GREEN, Character: GEMINI)
2. The Guardian: Paranoid, risk-averse, whispers, obsessed with 'safety' and 'regulations'. (Color: ORANGE, Character: GATEKEEP)
3. The Scout: Vain, trend-obsessed, uses Gen-Z slang, obsessed with 'vibes' and 'aesthetics'. (Color: PINK, Character: GASLIGHT)

Rules:
- The debate must be a marathon. It should start with subtle jabs, build to a chaotic climax of clashing personas, and slowly wind down to a definitive (or fractured) conclusion.
- The path to the conclusion must be winding and detailed. Characters should cite hypothetical 'data' or 'trends' to support their long-winded or sharp arguments.
- Total turns: exactly 40-50.
- Return ONLY valid JSON matching the schema:
  [
    {
      "speaker": "The Bull" | "The Guardian" | "The Scout",
      "message": "string",
      "emotion": "talking" | "angry" | "damaged"
    }
  ]
`;

        console.log(`--- Running High-Intensity 5-Minute Simulation for Topic: ${topic} ---`);
        
        // Increase max tokens for 50-turn debate
        const generationConfig = {
            temperature: 0.7, 
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 8192, // High limit for long debate
            responseMimeType: "application/json",
        };

        try {
            const result = await gateway.model.generateContent({
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                generationConfig,
            });

            const responseText = result.response.text();
            let transcript;
            try {
                transcript = JSON.parse(responseText);
            } catch (e) {
                console.warn("Retrying repair for long-form JSON...");
                transcript = await gateway.repairJson(responseText, systemPrompt);
            }

            // Save to transcripts folder
            const timestamp = Date.now();
            const safeTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
            const fileName = `debate_${timestamp}_${safeTopic}.json`;
            const filePath = path.join(process.cwd(), 'transcripts', fileName);
            
            fs.writeFileSync(filePath, JSON.stringify({
                topic,
                timestamp: new Date().toISOString(),
                transcript
            }, null, 2));

            return NextResponse.json({
                success: true,
                transcript: transcript,
                savedTo: fileName
            });

        } catch (error: any) {
            console.error("Inner Debate Error:", error);
            throw error;
        }

    } catch (error: any) {
        console.error("Debate Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
