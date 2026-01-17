
export interface Ingredient {
  id: string;
  name: string;
  isPriority: boolean;
}

export interface UsedIngredient {
  name: string;
  source: 'priority' | 'pantry';
  substitutedFrom?: string; // New: tracking agentic swaps
}

export interface Recipe {
  steps: string[];
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  masalas: string[];
}

export interface Meal {
  title: string;
  description: string;
  ingredientsUsed: UsedIngredient[];
  recipe: Recipe;
}

export interface DailyPlan {
  day: number;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

export interface ScrapTip {
  scrap: string;
  suggestion: string;
  type: 'recipe' | 'compost' | 'household';
}

export interface ImpactStats {
  carbonSaved: number; // in kg
  waterSaved: number; // in liters
  moneySaved: number; // in dollars
}

export interface PlannerResponse {
  plan: DailyPlan[];
  tips: ScrapTip[];
  impact: ImpactStats; // New: agentic impact calculation
}
