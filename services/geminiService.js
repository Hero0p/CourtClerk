const { GoogleGenAI } = require("@google/genai");

// Get API key from environment variable
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY not found in environment variables");
}

const ai = new GoogleGenAI({ key: apiKey });

async function getLegalAdvice(query) {
    try {
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured");
        }

        const systemInstruction =
            "You are an AI Legal Assistant specialized in Indian laws. " +
            "Provide legal advice strictly based on the following sources: " +
            "the Indian Constitution, the Indian Penal Code (IPC), the Code of Criminal Procedure (CrPC), " +
            "Supreme Court and High Court judgments, and authoritative legal commentaries.\\n\\n" +
            "User Query: " + query + "\\n\\n" +
            "Provide a detailed and legally accurate response with references to relevant sections, laws, or case laws.";

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemInstruction }] // Incorporating prompt as user message to match previous python logic exactly, or we can use config.systemInstruction if strictly supported by new SDK in this way, but passing as text is safer ensuring prompt adherence.
                }
            ]
        });
        // console.log(response.text)

        return response.text;
    } catch (error) {
        console.error("Error in geminiService:", error);
        // Return a user-friendly error message or rethrow
        throw new Error("Failed to get response from Legal AI");
    }
}

module.exports = {
    getLegalAdvice
};
