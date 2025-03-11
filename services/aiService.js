const { spawn } = require('child_process');
const path = require('path');

const legalAdviceResponses = {
  police: {
    keywords: ['police', 'officer', 'cop', 'law enforcement'],
    response: `Based on Indian law, if a police officer has used excessive force or hit you with a weapon, you have the following rights:

1. Right to File an FIR:
- Under Section 154 of CrPC, you have the right to file an FIR at any police station
- The police station is obligated to register your complaint
- If they refuse, you can approach the Superintendent of Police or the Magistrate under Section 156(3) CrPC

2. Legal Protection:
- Article 21 of the Indian Constitution protects your right to life and personal liberty
- Section 330 and 331 of IPC make it punishable for a public servant to cause hurt to extract confession
- The Supreme Court in D.K. Basu vs State of West Bengal (1997) laid down guidelines for arrest and detention

3. Medical Examination:
- You have the right to undergo immediate medical examination
- The medical report can serve as crucial evidence
- Section 54 CrPC provides for medical examination of arrested persons

4. Legal Remedies:
- File a complaint with the State Human Rights Commission
- Approach the National Human Rights Commission
- File a writ petition under Article 226 in the High Court
- Seek compensation for violation of fundamental rights

Relevant Case Law:
- Nilabati Behera vs State of Orissa (1993): Supreme Court established the principle of compensation for police brutality
- Raghbir Singh vs State of Haryana (1980): Court emphasized that police torture is a violation of human dignity

Remember to:
1. Document your injuries (photographs, medical reports)
2. Note down details (officer's name, badge number, time, location)
3. Seek immediate medical attention
4. Contact a legal professional`
  },
  // Add more predefined responses for different legal scenarios
};

function findRelevantResponse(query) {
  // Convert query to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase();
  
  // Find matching response based on keywords
  for (const [category, data] of Object.entries(legalAdviceResponses)) {
    if (data.keywords.some(keyword => lowerQuery.includes(keyword))) {
      return data.response;
    }
  }
  
  // Default response if no specific match is found
  return `Based on Indian law, regarding your query: "${query}"

I recommend:
1. Consulting with a qualified legal professional for specific advice
2. Documenting all relevant details and evidence
3. Understanding your fundamental rights under the Constitution

Please note that this is general information and not specific legal advice. Each case is unique and may require different legal approaches.

Relevant Constitutional Provisions:
- Article 14: Right to Equality
- Article 21: Right to Life and Personal Liberty
- Article 22: Protection against Arbitrary Arrest and Detention

For specific legal guidance, please consult with a lawyer who can review your case in detail.`;
}

module.exports = {
  getLegalAdvice: async (query) => {
    return new Promise((resolve, reject) => {
      try {
        // Spawn Python process
        const pythonProcess = spawn('python', [
          path.join(__dirname, 'legalAI.py'),
          query
        ]);

        let result = '';
        let error = '';

        // Collect data from script
        pythonProcess.stdout.on('data', (data) => {
          result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error('Python script error:', error);
            reject(new Error('Failed to get AI response'));
            return;
          }

          try {
            const response = JSON.parse(result);
            if (response.success) {
              resolve(response.response);
            } else {
              reject(new Error(response.error || 'Failed to get AI response'));
            }
          } catch (e) {
            console.error('Error parsing Python response:', e);
            reject(new Error('Invalid response from AI service'));
          }
        });

      } catch (error) {
        console.error('Error running Python script:', error);
        reject(error);
      }
    });
  }
}; 