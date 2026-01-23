import { NextRequest, NextResponse } from "next/server";
import { ingestFile } from "@/backend/ingestion";
import { ModelGateway } from "@/backend/gateway";
import { ArgumentGenerator } from "@/backend/argumentGenerator";
import { Orchestrator } from "@/backend/orchestrator";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const { filePath } = await req.json();

        if (!filePath) {
            return NextResponse.json({ error: "No file path provided" }, { status: 400 });
        }

        // 1. Ingestion
        console.log("--- 1. Ingesting File ---");
        const ingestionResult: any = await ingestFile(filePath);
        const payload = ingestionResult.modelPayload;

        // 2. Setup Debate Modules
        const gateway = new ModelGateway("gemini-2.0-flash");
        const argGen = new ArgumentGenerator(gateway);
        const orchestrator = new Orchestrator(argGen);

        // 3. Run Debate
        console.log("--- 2. Running Debate ---");
        const transcript = await orchestrator.runDebate(payload, 1); // 1 round for MVP speed

        return NextResponse.json({
            success: true,
            transcript: transcript,
            digest: payload
        });

    } catch (error: any) {
        console.error("Debate Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
