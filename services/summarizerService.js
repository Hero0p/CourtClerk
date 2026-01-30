const axios = require('axios');

// Replace with your Gemini API key and endpoint
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Calls Gemini API to summarize a document and extract keywords and tricky terms.
 * @param {string} text - The text to summarize.
 * @returns {Promise<Object>} { text, keywords, trickyTerms }
 */
async function summarizeDocumentWithGemini(text) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not set.');
  // Prompt engineering for legal summarization
  const prompt = `Summarize the following legal document. Include:
- A concise summary
- A list of all important keywords
- A list of important or tricky terms and conditions (if any)

Document:
"""
${text}
"""`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  const response = await axios.post(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    body,
    { headers: { 'Content-Type': 'application/json' } }
  );
  // Parse Gemini response
  const resultText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Simple parsing: split into sections
  let summary = '', keywords = [], trickyTerms = [];
  const summaryMatch = resultText.match(/summary[:\-\n]*([\s\S]*?)(keywords[:\-\n]|$)/i);
  if (summaryMatch) summary = summaryMatch[1].trim();
  const keywordsMatch = resultText.match(/keywords[:\-\n]*([\s\S]*?)(important|tricky terms|$)/i);
  if (keywordsMatch) keywords = keywordsMatch[1].split(/,|\n/).map(s => s.trim()).filter(Boolean);
  const trickyMatch = resultText.match(/(important|tricky terms|terms and conditions)[:\-\n]*([\s\S]*)/i);
  if (trickyMatch) trickyTerms = trickyMatch[2].split(/,|\n/).map(s => s.trim()).filter(Boolean);
  return { text: summary || resultText, keywords, trickyTerms };
}

module.exports = { summarizeDocumentWithGemini };
