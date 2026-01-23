/**
 * Orchestrator manages the flow of the debate.
 */
export class Orchestrator {
    constructor(argumentGenerator) {
        this.argumentGenerator = argumentGenerator;
    }

    /**
     * Runs a full debate sequence.
     * @param {Object} datasetPayload - The model-ready data package.
     * @param {number} rounds - Number of rounds per agent.
     */
    async runDebate(datasetPayload, rounds = 2) {
        const transcript = [];
        const agents = ["CFO", "CTO", "Product"];

        console.log(`🎬 Starting Orchestration: ${agents.length} agents, ${rounds} rounds.`);

        for (let r = 0; r < rounds; r++) {
            console.log(`--- Round ${r + 1} ---`);
            for (const agentKey of agents) {
                console.log(`🎤 Next Speaker: ${agentKey}`);
                try {
                    const turn = await this.argumentGenerator.generateTurn(agentKey, transcript, datasetPayload);
                    transcript.push(turn);
                } catch (error) {
                    console.error(`❌ Error during ${agentKey}'s turn:`, error.message);
                    // Continue to next agent/round even if one fails for robustness in MVP
                    transcript.push({
                        speaker: agentKey,
                        message: "I seem to be having trouble articulating my thoughts right now. Let's hear from the next person.",
                        claims: [],
                        counterpoints: [],
                        next_question: "What do you think?"
                    });
                }
            }
        }

        console.log("🏁 Debate finished. Transcript length:", transcript.length);
        return transcript;
    }
}
