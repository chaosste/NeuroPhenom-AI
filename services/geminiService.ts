
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LanguagePreference } from "../types";

// Removed local API_KEY constant to use process.env.API_KEY directly as per guidelines

export const getWelcomeMessage = async (language: LanguagePreference): Promise<string> => {
  // Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate a warm, context-aware introduction for a neurophenomenology interview. 
  Briefly explain the concept (exploring the "how" of experience) and suggest a starting point. 
  Use ${language === LanguagePreference.UK ? 'UK' : 'US'} spelling and tone.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Welcome to your neurophenomenology session. Shall we begin by identifying a specific experience to explore?";
  } catch (error) {
    console.error("Error fetching welcome message:", error);
    return "Welcome. I am ready to guide you through a reflective neurophenomenology session.";
  }
};

export const analyzeInterview = async (transcriptText: string, language: LanguagePreference): Promise<AnalysisResult> => {
  // Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      takeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
      modalities: { type: Type.ARRAY, items: { type: Type.STRING } },
      phasesCount: { type: Type.INTEGER },
      diachronicStructure: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phaseName: { type: Type.STRING },
            description: { type: Type.STRING },
            startTime: { type: Type.STRING }
          },
          required: ["phaseName", "description", "startTime"]
        }
      },
      synchronicStructure: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            details: { type: Type.STRING }
          },
          required: ["category", "details"]
        }
      },
      transcript: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speaker: { type: Type.STRING },
            text: { type: Type.STRING },
            startTime: { type: Type.NUMBER }
          },
          required: ["speaker", "text"]
        }
      }
    },
    required: ["summary", "takeaways", "modalities", "phasesCount", "diachronicStructure", "synchronicStructure", "transcript"]
  };

  const prompt = `Analyze this neurophenomenology interview transcript. 
  Identify the diachronic (temporal unfolding) and synchronic (structural qualities) dimensions. 
  Diarize the transcript into Interviewer vs Interviewee if it's raw text.
  Use ${language === LanguagePreference.UK ? 'UK' : 'US'} spelling.
  
  TRANSCRIPT:
  ${transcriptText}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI analysis");
    }
    return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};
