
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Zero-Point Food Planner API")

class Ingredient(BaseModel):
    name: str
    is_priority: bool

class UsedIngredient(BaseModel):
    name: str
    source: str # "priority" or "pantry"

class PlanningRequest(BaseModel):
    priority_ingredients: List[str]
    pantry_items: List[str]

class Meal(BaseModel):
    title: str
    description: str
    ingredients_used: List[UsedIngredient]

class DailyPlan(BaseModel):
    day: int
    breakfast: Meal
    lunch: Meal
    dinner: Meal

class ScrapTip(BaseModel):
    scrap: str
    suggestion: str
    type: str # "recipe", "compost", "household"

class PlanningResponse(BaseModel):
    plan: List[DailyPlan]
    tips: List[ScrapTip]

@app.get("/")
async def root():
    return {"message": "Welcome to the Food Waste Zero-Point Planner API"}

@app.post("/generate-plan", response_model=PlanningResponse)
async def generate_plan(request: PlanningRequest):
    """
    Endpoint to receive ingredients and return meal plans.
    """
    try:
        mock_response = {
            "plan": [
                {
                    "day": 1,
                    "breakfast": {
                        "title": f"Rescued {request.priority_ingredients[0] if request.priority_ingredients else 'Garden'} Bowl",
                        "description": "A high-energy start using your immediate priority items.",
                        "ingredients_used": [
                            {"name": request.priority_ingredients[0], "source": "priority"} if request.priority_ingredients else {"name": "Grains", "source": "pantry"}
                        ]
                    },
                    "lunch": {
                        "title": "Zero-Waste Harvest Salad",
                        "description": "A refreshing mix of rescue greens and pantry staples.",
                        "ingredients_used": [
                            {"name": "Pantry Grains", "source": "pantry"},
                            {"name": "Expiring Greens", "source": "priority"}
                        ]
                    },
                    "dinner": {
                        "title": "The Big Reset Stew",
                        "description": "Hearty stew designed to utilize all remaining priority stock.",
                        "ingredients_used": [
                            {"name": "Root Veggies", "source": "priority"},
                            {"name": "Stock Cubes", "source": "pantry"}
                        ]
                    }
                }
            ],
            "tips": [
                {
                    "scrap": "Vegetable Ends",
                    "suggestion": "Store in the freezer for a nutrient-dense homemade stock.",
                    "type": "recipe"
                }
            ]
        }
        return mock_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
