
import { GoogleGenAI, Type } from "@google/genai";
import { PlannerResponse, Meal } from "../types";

// Standardizing API key retrieval for Vercel/Vite/Browser environments
const getApiKey = () => {
  return process.env.API_KEY || (window as any).API_KEY || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
  },
  wasteFreeHacks: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: 'Specific tips for using scraps (like peels or stems) and ideas for transforming tomorrow\'s leftovers.'
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
          breakfast: { type: Type.OBJECT, properties: MEAL_PROPERTIES, required: ["title", "description", "ingredientsUsed", "recipe", "wasteFreeHacks"] },
          lunch: { type: Type.OBJECT, properties: MEAL_PROPERTIES, required: ["title", "description", "ingredientsUsed", "recipe", "wasteFreeHacks"] },
          dinner: { type: Type.OBJECT, properties: MEAL_PROPERTIES, required: ["title", "description", "ingredientsUsed", "recipe", "wasteFreeHacks"] }
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
    2. For EACH meal, include "wasteFreeHacks" which MUST provide ideas for scraps (e.g., "Don't toss potato peels—fry them with spices!") AND how to reuse the specific meal's leftovers.
    3. Suggest creative uses for common scraps.
    4. Ensure no waste is left over.
  `;

  try {
    const response = await ai.models.generateContent({
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

export const searchRecipes = async (query: string): Promise<Meal[]> => {
  const prompt = `As a world-class zero-waste chef, provide 3 detailed recipe suggestions for: ${query}. Focus on sustainability. For each recipe, include wasteFreeHacks for scraps and leftovers.`;
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
            required: ["title", "description", "ingredientsUsed", "recipe", "wasteFreeHacks"]
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
