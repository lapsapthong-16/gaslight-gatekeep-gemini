# backend/main.py
import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import your agents
from agents import PERSONAS

# 1. Load Environment Variables (API Key)
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file!")

# 2. Configure Gemini
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash-exp") 

# 3. Setup the Server
app = FastAPI()

# Allow your Team's Next.js Frontend (running on port 3000) to hit this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Define the Data Structure (What the Frontend sends you)
class RoundtableRequest(BaseModel):
    topic: str          # e.g., "Should we add a chatbot?"
    file_context: str   # The text content of the uploaded PDF/CSV

# 5. The API Endpoint
@app.post("/start-roundtable")
async def start_roundtable(request: RoundtableRequest):
    print(f"Received topic: {request.topic}")
    
    # Initialize the "Meeting Minutes"
    # This string grows as agents talk, acting as the memory
    conversation_history = f"""
    CONTEXT DATA (FROM FILE): 
    {request.file_context[:5000]} # Limit text to avoid token limits if file is huge

    MEETING TOPIC: 
    {request.topic}
    """

    transcript = [] # We will return this list to the frontend

    # 6. THE LOOP: Make them fight
    # Order: Product (Starts the hype) -> CFO (Shoots it down) -> CTO (Complains about work)
    for agent in PERSONAS:
        
        # Build the prompt for THIS specific agent
        prompt = f"""
        {agent['role']}
        {agent['instructions']}

        ---
        CURRENT MEETING TRANSCRIPT:
        {conversation_history}
        ---

        YOUR TURN:
        Reply to the transcript above. 
        - If you are the first speaker, kick off the discussion based on the topic.
        - If others have spoken, critique their specific points.
        - Keep your response under 60 words.
        - Be in character.
        """

        try:
            # Call Gemini
            response = model.generate_content(prompt)
            reply_text = response.text.strip()

            # Add to History (So the next agent 'hears' it)
            conversation_history += f"\n{agent['name']}: {reply_text}"

            # Add to Response List
            transcript.append({
                "agent_id": agent["id"],
                "agent_name": agent["name"],
                "message": reply_text
            })
            
            print(f"Generated response for {agent['name']}")

        except Exception as e:
            print(f"Error generating {agent['name']}: {e}")
            transcript.append({
                "agent_id": agent["id"],
                "agent_name": agent["name"],
                "message": "(Agent was too stunned to speak - Error)"
            })

    # Return the full fight to the frontend
    return {"transcript": transcript}