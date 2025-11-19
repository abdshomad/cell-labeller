import { GoogleGenAI, Type } from "@google/genai";
import { CellAnnotation } from '../types';

// Initialize Gemini Client
// Note: API key is expected to be in process.env.API_KEY
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes the image using Gemini to detect specific objects defined by the target.
 * Returns bounding boxes and labels for simulated segmentation.
 */
export const detectObjects = async (
  base64Image: string, 
  target: string = "biological cells"
): Promise<CellAnnotation[]> => {
  const ai = getAiClient();

  // Using gemini-3-pro-preview as requested for advanced image understanding
  const modelId = 'gemini-3-pro-preview';

  const prompt = `
    Analyze this image and identify all instances of: ${target}.
    Return a list of bounding boxes for each detected instance.
    Be thorough and include small or partially visible instances.
    The coordinates should be normalized (0.0 to 1.0).
    Assign a confidence score (0.0 to 1.0) based on clarity.
    Label them as "${target}" or specific subtypes if applicable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: `List of detected ${target}`,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique identifier for the object" },
              label: { type: Type.STRING, description: "Class label" },
              confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
              bbox: {
                type: Type.ARRAY,
                description: "Bounding box [ymin, xmin, ymax, xmax] normalized 0-1",
                items: { type: Type.NUMBER },
                minItems: 4,
                maxItems: 4
              }
            },
            required: ["id", "label", "confidence", "bbox"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    const data = JSON.parse(jsonText) as CellAnnotation[];
    return data;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};