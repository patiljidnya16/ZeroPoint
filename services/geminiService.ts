
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PlannerResponse, Meal } from "../types";

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
        source: { type: Type.STRING },
        substitutedFrom: { type: Type.STRING, description: "If the agent swapped this for a missing pantry item, name the original missing item." }
      },
      required: ["name", "source"]
    } 
  },
  recipe: {
    type: Type.OBJECT,
    properties: {
      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      prepTime: { type: Type.STRING },
      difficulty: { type: Type.STRING },
      masalas: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["steps", "prepTime", "difficulty", "masalas"]
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
          type: { type: Type.STRING }
        },
        required: ["scrap", "suggestion", "type"]
      }
    },
    impact: {
      type: Type.OBJECT,
      properties: {
        carbonSaved: { type: Type.NUMBER },
        waterSaved: { type: Type.NUMBER },
        moneySaved: { type: Type.NUMBER }
      },
      required: ["carbonSaved", "waterSaved", "moneySaved"]
    }
  },
  required: ["plan", "tips", "impact"]
};

export const generateWasteFreePlan = async (
  priorityIngredients: string[],
  pantryItems: string[]
): Promise<PlannerResponse> => {
  const prompt = `
    ROLE: You are the ZeroPoint Agent. Your goal is to eliminate food waste through intelligent planning and autonomous substitutions.
    
    TASK: Create a 2-day meal plan using:
    - PRIORITY (MUST USE): ${priorityIngredients.join(", ")}
    - PANTRY (AVAILABLE): ${pantryItems.join(", ")}
    
    AGENTIC GUIDELINES:
    1. If a key ingredient for a classic recipe is missing, use your reasoning to substitute it with an available PANTRY item. Note the 'substitutedFrom' in the data.
    2. Create "Chain Recipes": Day 1 components should ideally be reused in Day 2 (e.g., Day 1 steamed rice becomes Day 2 fried rice).
    3. Calculate the environmental impact based on the weight/type of priority ingredients saved.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: PLANNER_SCHEMA,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });
    return JSON.parse(response.text || "{}") as PlannerResponse;
  } catch (error) {
    console.error("Agent Engine Error:", error);
    throw error;
  }
};

export const searchRecipes = async (query: string): Promise<Meal[]> => {
  const prompt = `Act as a professional chef. Find 3 recipes for: "${query}". Ensure they are waste-friendly.`;
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
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

export const analyzeImage = async (base64Data: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { text: "Identify every food item in this fridge/pantry. Be specific (e.g., 'Half-cut Onion' instead of just 'Onion'). Return comma separated list." },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ]
      }
    });
    return (response.text || "").split(',').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    return [];
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    return undefined;
  }
};
