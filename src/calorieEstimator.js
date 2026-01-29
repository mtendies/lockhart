/**
 * Calorie Estimator
 * Parses food descriptions and estimates calories based on common foods
 * Educational tool - estimates only, not precise nutrition tracking
 */

// Common food calorie database (per typical serving)
const FOOD_DATABASE = {
  // Breakfast items
  'oatmeal': { calories: 150, serving: '1 cup cooked', category: 'grain' },
  'oats': { calories: 150, serving: '1 cup cooked', category: 'grain' },
  'egg': { calories: 70, serving: '1 large', category: 'protein' },
  'eggs': { calories: 140, serving: '2 large', category: 'protein' },
  'scrambled eggs': { calories: 180, serving: '2 eggs with butter', category: 'protein' },
  'bacon': { calories: 120, serving: '3 slices', category: 'protein' },
  'toast': { calories: 80, serving: '1 slice', category: 'grain' },
  'bagel': { calories: 280, serving: '1 medium', category: 'grain' },
  'pancake': { calories: 175, serving: '2 medium', category: 'grain' },
  'pancakes': { calories: 350, serving: '4 medium', category: 'grain' },
  'waffle': { calories: 220, serving: '1 large', category: 'grain' },
  'cereal': { calories: 150, serving: '1 cup with milk', category: 'grain' },
  'yogurt': { calories: 150, serving: '1 cup', category: 'dairy' },
  'greek yogurt': { calories: 130, serving: '1 cup', category: 'dairy' },
  'fage': { calories: 130, serving: '1 cup', category: 'dairy' },

  // Proteins
  'chicken': { calories: 165, serving: '4 oz cooked', category: 'protein' },
  'chicken breast': { calories: 165, serving: '4 oz', category: 'protein' },
  'grilled chicken': { calories: 165, serving: '4 oz', category: 'protein' },
  'salmon': { calories: 200, serving: '4 oz', category: 'protein' },
  'tuna': { calories: 120, serving: '4 oz', category: 'protein' },
  'steak': { calories: 270, serving: '6 oz', category: 'protein' },
  'beef': { calories: 250, serving: '4 oz', category: 'protein' },
  'ground beef': { calories: 280, serving: '4 oz (85% lean)', category: 'protein' },
  'turkey': { calories: 150, serving: '4 oz', category: 'protein' },
  'pork': { calories: 200, serving: '4 oz', category: 'protein' },
  'shrimp': { calories: 100, serving: '4 oz', category: 'protein' },
  'tofu': { calories: 80, serving: '4 oz', category: 'protein' },

  // Dairy
  'milk': { calories: 120, serving: '1 cup', category: 'dairy' },
  'almond milk': { calories: 40, serving: '1 cup', category: 'dairy' },
  'cheese': { calories: 110, serving: '1 oz', category: 'dairy' },
  'goat cheese': { calories: 100, serving: '1 oz', category: 'dairy' },
  'cream cheese': { calories: 100, serving: '2 tbsp', category: 'dairy' },
  'cottage cheese': { calories: 110, serving: '1/2 cup', category: 'dairy' },

  // Grains & Carbs
  'rice': { calories: 200, serving: '1 cup cooked', category: 'grain' },
  'brown rice': { calories: 220, serving: '1 cup cooked', category: 'grain' },
  'pasta': { calories: 200, serving: '1 cup cooked', category: 'grain' },
  'bread': { calories: 80, serving: '1 slice', category: 'grain' },
  'tortilla': { calories: 90, serving: '1 medium', category: 'grain' },
  'quinoa': { calories: 220, serving: '1 cup cooked', category: 'grain' },
  'potato': { calories: 160, serving: '1 medium', category: 'grain' },
  'sweet potato': { calories: 100, serving: '1 medium', category: 'grain' },

  // Vegetables
  'salad': { calories: 50, serving: '2 cups greens', category: 'vegetable' },
  'spinach': { calories: 7, serving: '1 cup', category: 'vegetable' },
  'broccoli': { calories: 55, serving: '1 cup', category: 'vegetable' },
  'vegetables': { calories: 50, serving: '1 cup mixed', category: 'vegetable' },
  'veggies': { calories: 50, serving: '1 cup mixed', category: 'vegetable' },
  'avocado': { calories: 240, serving: '1 whole', category: 'vegetable' },
  'carrots': { calories: 50, serving: '1 cup', category: 'vegetable' },

  // Fruits
  'banana': { calories: 105, serving: '1 medium', category: 'fruit' },
  'apple': { calories: 95, serving: '1 medium', category: 'fruit' },
  'orange': { calories: 60, serving: '1 medium', category: 'fruit' },
  'berries': { calories: 85, serving: '1 cup', category: 'fruit' },
  'blueberries': { calories: 85, serving: '1 cup', category: 'fruit' },
  'strawberries': { calories: 50, serving: '1 cup', category: 'fruit' },
  'grapes': { calories: 60, serving: '1 cup', category: 'fruit' },

  // Nuts & Seeds
  'almonds': { calories: 165, serving: '1 oz (~23)', category: 'nuts', tip: 'Nuts are calorie-dense! A small handful is about 165 calories.' },
  'peanuts': { calories: 170, serving: '1 oz', category: 'nuts' },
  'walnuts': { calories: 185, serving: '1 oz', category: 'nuts' },
  'cashews': { calories: 160, serving: '1 oz', category: 'nuts' },
  'peanut butter': { calories: 190, serving: '2 tbsp', category: 'nuts', tip: 'Nut butters are calorie-dense! 2 tbsp = 190 calories.' },
  'almond butter': { calories: 200, serving: '2 tbsp', category: 'nuts' },
  'seeds': { calories: 150, serving: '1 oz', category: 'nuts' },
  'chia seeds': { calories: 140, serving: '1 oz', category: 'nuts' },
  'super seed': { calories: 150, serving: '2 tbsp', category: 'nuts' },

  // Supplements & Protein
  'protein powder': { calories: 120, serving: '1 scoop', category: 'supplement' },
  'protein shake': { calories: 200, serving: '1 shake', category: 'supplement' },
  'vega': { calories: 130, serving: '1 scoop', category: 'supplement' },
  'whey': { calories: 120, serving: '1 scoop', category: 'supplement' },
  'smoothie': { calories: 300, serving: '16 oz', category: 'beverage' },

  // Condiments & Additions
  'honey': { calories: 60, serving: '1 tbsp', category: 'condiment' },
  'maple syrup': { calories: 50, serving: '1 tbsp', category: 'condiment' },
  'butter': { calories: 100, serving: '1 tbsp', category: 'condiment', tip: 'Butter adds up quickly - 1 tbsp = 100 calories.' },
  'olive oil': { calories: 120, serving: '1 tbsp', category: 'condiment', tip: 'Oils are calorie-dense! 1 tbsp = 120 calories.' },
  'oil': { calories: 120, serving: '1 tbsp', category: 'condiment' },
  'dressing': { calories: 80, serving: '2 tbsp', category: 'condiment', tip: 'Salad dressings can add 80-150 calories per serving.' },
  'mayo': { calories: 90, serving: '1 tbsp', category: 'condiment' },
  'mayonnaise': { calories: 90, serving: '1 tbsp', category: 'condiment' },
  'ketchup': { calories: 20, serving: '1 tbsp', category: 'condiment' },
  'mustard': { calories: 5, serving: '1 tsp', category: 'condiment' },
  'cocoa powder': { calories: 20, serving: '1 tbsp', category: 'condiment' },

  // Beverages
  'coffee': { calories: 5, serving: '1 cup black', category: 'beverage' },
  'latte': { calories: 190, serving: '12 oz', category: 'beverage' },
  'juice': { calories: 120, serving: '8 oz', category: 'beverage' },
  'orange juice': { calories: 110, serving: '8 oz', category: 'beverage' },
  'soda': { calories: 140, serving: '12 oz', category: 'beverage' },
  'beer': { calories: 150, serving: '12 oz', category: 'beverage', tip: 'Alcohol has empty calories - no nutritional value.' },
  'wine': { calories: 125, serving: '5 oz', category: 'beverage' },

  // Snacks
  'chips': { calories: 150, serving: '1 oz (~15 chips)', category: 'snack' },
  'crackers': { calories: 120, serving: '6 crackers', category: 'snack' },
  'pretzels': { calories: 110, serving: '1 oz', category: 'snack' },
  'granola bar': { calories: 140, serving: '1 bar', category: 'snack' },
  'protein bar': { calories: 220, serving: '1 bar', category: 'snack' },

  // Desserts
  'chocolate': { calories: 150, serving: '1 oz', category: 'dessert' },
  'dark chocolate': { calories: 170, serving: '1 oz', category: 'dessert' },
  'ice cream': { calories: 250, serving: '1/2 cup', category: 'dessert' },
  'cookie': { calories: 100, serving: '1 medium', category: 'dessert' },
  'cookies': { calories: 200, serving: '2 medium', category: 'dessert' },
  'cake': { calories: 350, serving: '1 slice', category: 'dessert' },

  // Meals (estimates)
  'sandwich': { calories: 400, serving: '1 sandwich', category: 'meal' },
  'burger': { calories: 550, serving: '1 with bun', category: 'meal' },
  'pizza': { calories: 280, serving: '1 slice', category: 'meal' },
  'curry': { calories: 350, serving: '1 cup', category: 'meal' },
  'stir fry': { calories: 300, serving: '1.5 cups', category: 'meal' },
  'soup': { calories: 150, serving: '1 cup', category: 'meal' },
  'burrito': { calories: 500, serving: '1 burrito', category: 'meal' },
  'tacos': { calories: 400, serving: '2 tacos', category: 'meal' },
};

// Quantity modifiers
const QUANTITY_MODIFIERS = {
  'half': 0.5,
  '1/2': 0.5,
  'quarter': 0.25,
  '1/4': 0.25,
  'double': 2,
  'two': 2,
  'three': 3,
  'four': 4,
  'few': 1.5,
  'some': 1,
  'handful': 1,
  'large': 1.5,
  'big': 1.5,
  'small': 0.7,
  'little': 0.5,
};

// Size multipliers for "cups" etc
const UNIT_PATTERNS = [
  { pattern: /(\d+(?:\.\d+)?)\s*(?:cups?|c)\b/gi, multiplier: 1 },
  { pattern: /(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?)\b/gi, baseCalories: 60 },
  { pattern: /(\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\b/gi, baseCalories: 20 },
  { pattern: /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b/gi, multiplier: 1 },
  { pattern: /(\d+(?:\.\d+)?)\s*(?:scoops?)\b/gi, multiplier: 1 },
  { pattern: /(\d+(?:\.\d+)?)\s*(?:slices?)\b/gi, multiplier: 1 },
  { pattern: /(\d+(?:\.\d+)?)\s*(?:pieces?)\b/gi, multiplier: 1 },
];

/**
 * Parse a food description and estimate calories
 * @param {string} text - The food description (e.g., "oatmeal with honey and 2 eggs")
 * @returns {Object} - { totalCalories, breakdown: [{food, calories, serving}], tips: [], confidence: 'low'|'medium'|'high' }
 */
export function estimateCalories(text) {
  if (!text || typeof text !== 'string') {
    return { totalCalories: 0, breakdown: [], tips: [], confidence: 'low' };
  }

  const normalizedText = text.toLowerCase();
  const breakdown = [];
  const tips = new Set();
  let totalCalories = 0;
  let matchedFoods = 0;

  // Find all matching foods in the text
  for (const [foodName, foodData] of Object.entries(FOOD_DATABASE)) {
    // Check if this food is mentioned
    const regex = new RegExp(`\\b${foodName.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(normalizedText)) {
      let quantity = 1;

      // Check for quantity modifiers
      for (const [modifier, multiplier] of Object.entries(QUANTITY_MODIFIERS)) {
        const modRegex = new RegExp(`${modifier}\\s+(?:of\\s+)?${foodName.replace(/\s+/g, '\\s+')}`, 'i');
        if (modRegex.test(normalizedText)) {
          quantity = multiplier;
          break;
        }
      }

      // Check for numeric quantities
      const numericRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:of\\s+)?${foodName.replace(/\s+/g, '\\s+')}`, 'i');
      const numMatch = normalizedText.match(numericRegex);
      if (numMatch) {
        quantity = parseFloat(numMatch[1]);
      }

      const estimatedCalories = Math.round(foodData.calories * quantity);

      breakdown.push({
        food: foodName.charAt(0).toUpperCase() + foodName.slice(1),
        calories: estimatedCalories,
        serving: quantity !== 1 ? `${quantity}x ${foodData.serving}` : foodData.serving,
      });

      totalCalories += estimatedCalories;
      matchedFoods++;

      if (foodData.tip) {
        tips.add(foodData.tip);
      }
    }
  }

  // Determine confidence level
  let confidence = 'low';
  if (matchedFoods >= 3) {
    confidence = 'high';
  } else if (matchedFoods >= 1) {
    confidence = 'medium';
  }

  // Add generic tips if no specific tips found
  if (tips.size === 0 && totalCalories > 0) {
    if (normalizedText.includes('oil') || normalizedText.includes('butter') || normalizedText.includes('fried')) {
      tips.add('Cooking oils and butter add calories quickly - 1 tbsp oil = 120 cal.');
    }
    if (normalizedText.includes('cheese')) {
      tips.add('Cheese is calorie-dense - 1 oz = about 110 calories.');
    }
  }

  return {
    totalCalories,
    breakdown,
    tips: Array.from(tips),
    confidence,
    matchedFoods,
  };
}

/**
 * Check if a food description contains vague quantities that could use clarification
 * @param {string} text - The food description
 * @returns {Object|null} - { item, question, options } or null if no clarification needed
 */
export function needsClarification(text) {
  if (!text || typeof text !== 'string') return null;

  const normalizedText = text.toLowerCase();

  const vaguePatterns = [
    {
      pattern: /handful\s+(?:of\s+)?(\w+)/i,
      item: 'handful',
      question: (match) => `You mentioned "a handful of ${match}" - roughly how much would you estimate that is?`,
      options: [
        { label: 'Small (about 0.5 oz)', multiplier: 0.5 },
        { label: 'Medium (about 1 oz)', multiplier: 1 },
        { label: 'Large (about 1.5 oz)', multiplier: 1.5 },
      ],
    },
    {
      pattern: /(?:some|a\s+few|a\s+bit\s+of|a\s+little)\s+(\w+)/i,
      item: 'some',
      question: (match) => `You mentioned "some ${match}" - roughly how much?`,
      options: [
        { label: 'Small portion', multiplier: 0.5 },
        { label: 'Medium portion', multiplier: 1 },
        { label: 'Large portion', multiplier: 1.5 },
      ],
    },
    {
      pattern: /(?:glass|cup)\s+(?:of\s+)?(\w+)/i,
      item: 'glass',
      question: (match) => `How big was the glass/cup of ${match}?`,
      options: [
        { label: 'Small (6-8 oz)', multiplier: 0.75 },
        { label: 'Medium (10-12 oz)', multiplier: 1 },
        { label: 'Large (16+ oz)', multiplier: 1.5 },
      ],
    },
    {
      pattern: /scoop\s+(?:of\s+)?(\w+)/i,
      item: 'scoop',
      question: (match) => `What size scoop of ${match}?`,
      options: [
        { label: 'Small scoop', multiplier: 0.7 },
        { label: 'Standard scoop', multiplier: 1 },
        { label: 'Heaping scoop', multiplier: 1.3 },
      ],
    },
  ];

  for (const { pattern, item, question, options } of vaguePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      return {
        item,
        matchedFood: match[1],
        question: question(match[1]),
        options,
      };
    }
  }

  return null;
}

/**
 * Get educational tip for a food category
 * @param {string} category - Food category
 * @returns {string|null}
 */
export function getEducationalTip(category) {
  const tips = {
    nuts: 'Nuts are nutrient-dense but calorie-dense too! A small handful (1 oz) of almonds has about 165 calories.',
    condiment: 'Condiments and oils can add up quickly. Measure your portions to stay on track.',
    dessert: 'Enjoying dessert in moderation is part of a balanced lifestyle. Savor it mindfully!',
    beverage: 'Liquid calories are easy to overlook. Water is always the best choice for hydration.',
    protein: 'Protein helps with satiety and muscle recovery. Aim for a palm-sized portion per meal.',
  };

  return tips[category] || null;
}
