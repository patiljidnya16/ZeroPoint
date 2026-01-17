
export interface Ingredient {
  id: string;
  name: string;
  isPriority: boolean;
}

export interface UsedIngredient {
  name: string;
  source: 'priority' | 'pantry';
}

export interface Recipe {
  steps: string[];
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  // List of spices or masalas used in the recipe.
  masalas?: string[];
}

export interface Meal {
  title: string;
  description: string;
  ingredientsUsed: UsedIngredient[];
  recipe: Recipe;
  // Creative ways to use scraps or leftovers from this specific meal.
  wasteFreeHacks: string[];
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

export interface PlannerResponse {
  plan: DailyPlan[];
  tips: ScrapTip[];
}
