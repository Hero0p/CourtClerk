from google import genai
import json
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_legal_advice(query):
    """
    AI Assistant for providing legal advice related to India.
    Refers to: Constitution, IPC, CrPC, judgments, and legal commentaries.
    """
    try:
        # Get API key from environment variable
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        client = genai.Client(api_key=api_key)
        
        prompt = (
            "You are an AI Legal Assistant specialized in Indian laws. "
            "Provide legal advice strictly based on the following sources: "
            "the Indian Constitution, the Indian Penal Code (IPC), the Code of Criminal Procedure (CrPC), "
            "Supreme Court and High Court judgments, and authoritative legal commentaries.\n\n"
            "User Query: " + query + "\n\n"
            "Provide a detailed and legally accurate response with references to relevant sections, laws, or case laws."
        )
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
        )
        
        # Return response as JSON
        result = {
            'success': True,
            'response': response.text
        }
        
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
    
    print(json.dumps(result))

if __name__ == "__main__":
    # Get query from command line argument
    if len(sys.argv) > 1:
        query = sys.argv[1]
        get_legal_advice(query) 