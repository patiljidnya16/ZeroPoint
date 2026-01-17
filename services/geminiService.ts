
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PlannerResponse, Meal } from "../types";

// Initialize the Gemini API client using the environment API key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MEAL_PROPERTIES = {
  title: { type: Type.STRING },
  description: { type: Type.STRING },
  ingredientsUsed: { 
    type: Type.ARRAY, 
    items: { 
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        source: { type: Type.STRING, description: 'Source must be "priority" or "pantry"' }
      },
      required: ["name", "source"]
    } 
  },
  recipe: {
    type: Type.OBJECT,
    properties: {
      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      prepTime: { type: Type.STRING },
      difficulty: { type: Type.STRING, description: 'Must be "Easy", "Medium", or "Hard"' },
      masalas: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: 'Optional list of spices or seasonings used.'
      }
    },
    required: ["steps", "prepTime", "difficulty"]
  }
};

const PLANNER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    plan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.NUMBER },
          breakfast: { type: Type.OBJECT, properties: MEAL_PROPERTIES, required: ["title", "description", "ingredientsUsed", "recipe"] },
          lunch: { type: Type.OBJECT, properties: MEAL_PROPERTIES, required: ["title", "description", "ingredientsUsed", "recipe"] },
          dinner: { type: Type.OBJECT, properties: MEAL_PROPERTIES, required: ["title", "description", "ingredientsUsed", "recipe"] }
        },
        required: ["day", "breakfast", "lunch", "dinner"]
      }
    },
    tips: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scrap: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          type: { type: Type.STRING, description: 'Type must be "recipe", "compost", or "household"' }
        },
        required: ["scrap", "suggestion", "type"]
      }
    }
  },
  required: ["plan", "tips"]
};

// Generates a waste-free meal plan using the Gemini API.
export const generateWasteFreePlan = async (
  priorityIngredients: string[],
  pantryItems: string[]
): Promise<PlannerResponse> => {
  const prompt = `
    As a sustainable zero-waste chef, create a 2-day meal plan with FULL RECIPES.
    PRIORITY INGREDIENTS: ${priorityIngredients.join(", ")}
    EXISTING PANTRY: ${pantryItems.join(", ")}
    
    Rules:
    1. Prioritize using the priority ingredients in the first day.
    2. Suggest creative uses for common scraps.
    3. Ensure no waste is left over.
  `;

  try {
    const response = await ai.models.generateContent({
      // Using gemini-3-flash-preview for text generation tasks as recommended.
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: PLANNER_SCHEMA,
      },
    });

    return JSON.parse(response.text || "{}") as PlannerResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// Searches for recipes based on a user query using Gemini.
export const searchRecipes = async (query: string): Promise<Meal[]> => {
  const prompt = `As a world-class zero-waste chef, provide 3 detailed recipe suggestions for: ${query}. Focus on sustainability and common pantry staples.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: MEAL_PROPERTIES,
            required: ["title", "description", "ingredientsUsed", "recipe"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as Meal[];
  } catch (error) {
    console.error("Search Recipes Error:", error);
    return [];
  }
};

// Analyzes an image to identify ingredients using Gemini 3 Pro for complex vision tasks.
export const analyzeImage = async (base64Data: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { text: "Identify all food ingredients in this image. Return a simple comma-separated list of ingredient names only." },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ]
      }
    });
    const text = response.text || "";
    return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    console.error("Image analysis error:", error);
    return [];
  }
};

// Provides quick advice for zero-waste scrap usage.
export const getScrapAdvice = async (scrap: string): Promise<string> => {
  const prompt = `Quick zero-waste tip for ${scrap}. 1 sentence max.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No suggestion found.";
  } catch (error) {
    return "Error getting advice.";
  }
};

// Generates text-to-speech audio for culinary instructions.
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return undefined;
  }
};
