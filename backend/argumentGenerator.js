/**
 * ArgumentGenerator handles the creation of persona-based arguments.
 */
export class ArgumentGenerator {
    constructor(gateway) {
        this.gateway = gateway;
        this.personas = {
            CFO: {
                name: "Marcus (CFO)",
                bio: "Conservative, obsessed with ROI, risk-averse, hates technical debt, focused on quarterly margins.",
                style: "Short, blunt, focused on dollar amounts and downside risks."
            },
            CTO: {
                name: "Sarah (CTO)",
                bio: "Visionary but pragmatic, focuses on scalability, developer experience, and long-term architectural stability.",
                style: "Logical, mentions technical constraints, prioritizes speed of delivery and future-proofing."
            },
            Product: {
                name: "Maya (Head of Product)",
                bio: "User-obsessed, driven by market share and competitive advantage, hates delays in shipping features.",
                style: "Optimistic, data-driven regarding user behavior, uses persuasive and enthusiastic language."
            }
        };
    }

    /**
     * Generates a single turn in the debate.
     */
    async generateTurn(personaKey, transcript, datasetPayload) {
        const persona = this.personas[personaKey];
        if (!persona) throw new Error(`Unknown persona: ${personaKey}`);

        const prompt = `
        You are ${persona.name}. 
        Bio: ${persona.bio}
        Style: ${persona.style}

        Context: You are in a boardroom debate about the following dataset.
        Dataset Summary: ${JSON.stringify(datasetPayload.datasetSummary)}
        Schema: ${JSON.stringify(datasetPayload.schema)}
        Key Samples: ${JSON.stringify(datasetPayload.samples.head)}

        Debate History so far:
        ${transcript.length === 0 ? "The meeting has just started. You are opening the discussion." : transcript.map(t => `${t.speaker}: ${t.message}`).join("\n")}

        Your Task:
        1. Challenge prior claims if any.
        2. Propose a decision or observation based on your persona and the data.
        3. Ask a provocative question to the next speaker.

        Response Format (JSON):
        {
            "speaker": "${persona.name}",
            "message": "your spoken message",
            "claims": ["claim 1", "claim 2"],
            "counterpoints": ["point against previous speaker if applicable"],
            "next_question": "question for the room"
        }
        `;

        return await this.gateway.generateStructuredContent(prompt);
    }
}
