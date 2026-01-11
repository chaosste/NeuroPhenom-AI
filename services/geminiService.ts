
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, LanguagePreference } from "../types";

// Get API key from localStorage
const getApiKey = (): string => {
  const savedSettings = localStorage.getItem('neuro_phenom_settings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      if (settings.apiKey) return settings.apiKey;
    } catch (e) {}
  }
  return '';
};

export const getWelcomeMessage = async (language: LanguagePreference): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Please add your Gemini API key in Settings to begin.";
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate a concise, professional clinical introduction for a neurophenomenology interview. 
  Focus on the 'how' of micro-experience. 
  Use ${language === LanguagePreference.UK ? 'UK' : 'US'} spelling and a sophisticated tone.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text || "Interface established. Shall we begin mapping your micro-experience?";
  } catch (error) {
    console.error("Welcome Error:", error);
    return "Clinical observer ready. Please describe a specific, singular experience to begin.";
  }
};

export const analyzeInterview = async (transcriptText: string, language: LanguagePreference): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Please add your Gemini API key in Settings");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
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
            speaker: { type: Type.STRING, enum: ["Interviewer", "Interviewee", "AI"] },
            text: { type: Type.STRING },
            startTime: { type: Type.NUMBER }
          },
          required: ["speaker", "text"]
        }
      }
    },
    required: ["summary", "takeaways", "modalities", "phasesCount", "diachronicStructure", "synchronicStructure", "transcript"]
  };

  const prompt = `MANDATORY INSTRUCTION:
  Analyze the provided raw data as a neurophenomenology interview.
  1. DIARIZATION: Extract turns between the 'Interviewer' (AI) and 'Interviewee' (User). 
  2. PHENOMENOLOGY: Map the diachronic temporal unfolding and synchronic structural features.
  3. REGISTRY: Identify the specific sensory modalities (visual, auditory, tactile, etc.).
  
  DATA FOR ANALYSIS:
  ${transcriptText}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("MAPPING_PROTOCOL_FAILURE_EMPTY");
    return JSON.parse(resultText.trim()) as AnalysisResult;
  } catch (error) {
    console.error("Critical Analysis Error:", error);
    throw error;
  }
};
