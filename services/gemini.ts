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
 * Simulates CellPose segmentation by asking Gemini to detect cells and return bounding boxes.
 * We then approximate the segmentation masks using ellipses within these boxes on the frontend.
 */
export const detectCells = async (base64Image: string): Promise<CellAnnotation[]> => {
  const ai = getAiClient();

  // Using gemini-2.5-flash for fast multimodal analysis
  const modelId = 'gemini-2.5-flash';

  const prompt = `
    Analyze this microscopy image as if you are a CellPose model.
    Identify distinct biological cells or nuclei.
    Return a list of bounding boxes for each detected cell.
    The coordinates should be normalized (0.0 to 1.0).
    Assign a confidence score (0.0 to 1.0) based on clarity.
    If you see different types, label them (e.g., "cell", "nucleus"), otherwise default to "cell".
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
          description: "List of detected cells",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique identifier for the cell" },
              label: { type: Type.STRING, description: "Class label, e.g., 'cell' or 'nucleus'" },
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