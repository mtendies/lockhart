/**
 * Calorie Estimator - Intelligent Parsing
 * Uses smart duplicate detection and proper portion recognition
 */

// Source URLs for calorie data
export const SOURCE_URLS = {
  'USDA': 'https://fdc.nal.usda.gov/',
  'Fage label': 'https://usa.fage/products/yogurt',
  'Vega label': 'https://myvega.com/products/vega-protein-greens',
  'Whole Foods label': 'https://www.wholefoodsmarket.com/',
  'Starbucks': 'https://www.starbucks.com/menu/nutrition-info',
  'Typical label': 'https://fdc.nal.usda.gov/',
  'Estimated': null,
};

// Description words to strip from segments before matching
const DESCRIPTION_WORDS = new Set([
  'big', 'large', 'small', 'medium', 'little', 'huge', 'hearty', 'loaded',
  'light', 'simple', 'plain', 'classic', 'homemade', 'fresh', 'mixed',
  'grilled', 'baked', 'fried', 'steamed', 'roasted',
]);

// Informal quantity words that indicate a guessed portion
const INFORMAL_QUANTITY_WORDS = new Set([
  'sprinkle', 'drizzle', 'dash', 'pinch', 'splash', 'dollop', 'handful', 'some',
]);

// Informal words that imply a specific unit (overrides database default unit)
const INFORMAL_UNIT_MAP = {
  'drizzle': 'tsp',     // ~1 tsp
  'splash': 'tbsp',     // ~2 tbsp
  'sprinkle': 'tbsp',   // ~1/2 tbsp
  'dash': 'tsp',        // ~1/4 tsp
  'dollop': 'tbsp',     // ~2 tbsp
  'handful': 'cup',     // ~1/4 cup (0.25 quantity)
};

// Number words to digits
const NUMBER_WORDS = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'half': 0.5, 'quarter': 0.25, 'a': 1, 'an': 1,
  'a couple': 2, 'couple': 2, 'a couple of': 2,
  'a few': 3, 'few': 3, 'several': 3,
  'dozen': 12, 'a dozen': 12, 'half dozen': 6, 'a half dozen': 6,
  'third': 0.33, 'a third': 0.33,
  // Small/informal quantities
  'sprinkle': 0.5,    // ~1/2 tbsp or ~1/2 oz
  'drizzle': 1,       // ~1 tsp
  'dash': 0.25,       // ~1/4 tsp
  'pinch': 0,         // negligible calories
  'splash': 2,        // ~2 tbsp liquid
  'dollop': 2,        // ~2 tbsp
};

// Unit normalization map
const UNIT_MAP = {
  'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbsp': 'tbsp', 't': 'tbsp',
  'teaspoon': 'tsp', 'teaspoons': 'tsp', 'tsp': 'tsp',
  'cup': 'cup', 'cups': 'cup', 'c': 'cup',
  'ounce': 'oz', 'ounces': 'oz', 'oz': 'oz',
  'pound': 'lb', 'pounds': 'lb', 'lb': 'lb', 'lbs': 'lb',
  'gram': 'g', 'grams': 'g', 'g': 'g',
  'scoop': 'scoop', 'scoops': 'scoop',
  'handful': 'handful', 'handfuls': 'handful',
  'spoonful': 'spoonful', 'spoonfuls': 'spoonful',
  'piece': 'piece', 'pieces': 'piece',
  'slice': 'slice', 'slices': 'slice',
  'strip': 'slice', 'strips': 'slice',  // bacon strips = slices
  'serving': 'serving', 'servings': 'serving',
  'glass': 'cup', 'glasses': 'cup',
  'breast': 'breast', 'breasts': 'breast',  // chicken breast
  'thigh': 'thigh', 'thighs': 'thigh',      // chicken thigh
  'fillet': 'fillet', 'fillets': 'fillet',  // fish fillet
};

// Known brand names (to combine with generic products)
const BRAND_NAMES = new Set([
  'vega', 'oikos', 'siggi', 'siggis', 'chobani', 'fage', 'quest',
  'orgain', 'optimum', 'garden of life', 'bob\'s red mill', 'bobs red mill',
  'whole foods', 'trader joe', 'trader joes', 'kirkland',
  'premier protein', 'fairlife', 'muscle milk', 'isopure',
  'rxbar', 'kind', 'larabar', 'clif', 'nature valley',
]);

// Food database with calories per standard unit
const FOOD_DATABASE = {
  // Protein powders & supplements
  'vega protein': { cal: 140, unit: 'scoop', serving: '1 scoop (36g)', source: 'Vega label' },
  'vega': { cal: 140, unit: 'scoop', serving: '1 scoop (36g)', source: 'Vega label' },
  'protein powder': { cal: 120, unit: 'scoop', serving: '1 scoop (~30g)', source: 'Typical label' },
  'whey protein': { cal: 120, unit: 'scoop', serving: '1 scoop', source: 'Typical label' },
  'whey': { cal: 120, unit: 'scoop', serving: '1 scoop', source: 'Typical label' },
  'collagen': { cal: 35, unit: 'scoop', serving: '1 scoop', source: 'Typical label' },

  // Seeds
  'super seed blend': { cal: 60, unit: 'tbsp', serving: '1 tbsp', source: 'Whole Foods label' },
  'super seed': { cal: 60, unit: 'tbsp', serving: '1 tbsp', source: 'Whole Foods label' },
  'seed blend': { cal: 60, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'chia seeds': { cal: 60, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'chia': { cal: 60, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'flax seeds': { cal: 55, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'flax': { cal: 55, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'hemp seeds': { cal: 55, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'hemp': { cal: 55, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },

  // Dairy
  'fage 2% yogurt': { cal: 120, unit: 'cup', serving: '1 cup', source: 'Fage label' },
  'fage yogurt': { cal: 120, unit: 'cup', serving: '1 cup', source: 'Fage label' },
  'fage 2%': { cal: 120, unit: 'cup', serving: '1 cup', source: 'Fage label' },
  'fage': { cal: 120, unit: 'cup', serving: '1 cup', source: 'Fage label' },
  'greek yogurt': { cal: 130, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'yogurt': { cal: 100, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'almond milk': { cal: 40, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'oat milk': { cal: 120, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'soy milk': { cal: 80, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'coconut milk': { cal: 45, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'milk': { cal: 120, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'cottage cheese': { cal: 110, unit: 'cup', serving: '1/2 cup', source: 'USDA' },
  'goat cheese': { cal: 75, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'cream cheese': { cal: 50, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'feta cheese': { cal: 75, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'feta': { cal: 50, unit: 'tbsp', serving: '1 tbsp crumbled', source: 'USDA' },
  'parmesan': { cal: 22, unit: 'tbsp', serving: '1 tbsp grated', source: 'USDA' },
  'cheddar': { cal: 115, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'mozzarella': { cal: 85, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'cheese': { cal: 110, unit: 'oz', serving: '1 oz', source: 'USDA' },

  // Fruits
  'banana': { cal: 105, unit: 'banana', serving: '1 medium (118g)', source: 'USDA' },
  'apple': { cal: 95, unit: 'apple', serving: '1 medium', source: 'USDA' },
  'orange': { cal: 60, unit: 'orange', serving: '1 medium', source: 'USDA' },
  'blueberries': { cal: 85, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'strawberries': { cal: 50, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'mixed berries': { cal: 70, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'berries': { cal: 70, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'grapes': { cal: 60, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'mango': { cal: 100, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'avocado': { cal: 240, unit: 'avocado', serving: '1 whole', source: 'USDA' },

  // Vegetables
  'spinach': { cal: 7, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'kale': { cal: 33, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'broccoli': { cal: 55, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'carrots': { cal: 50, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'riced cauliflower': { cal: 25, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'cauliflower rice': { cal: 25, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'cauliflower': { cal: 25, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'kimchi': { cal: 10, unit: 'cup', serving: '1/4 cup', source: 'USDA' },
  'vegetables': { cal: 50, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'veggies': { cal: 50, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'greens': { cal: 8, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'mixed greens': { cal: 8, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'salad greens': { cal: 8, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'lettuce': { cal: 5, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'arugula': { cal: 5, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'beets': { cal: 60, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'beet': { cal: 60, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'cucumber': { cal: 16, unit: 'cup', serving: '1 cup', source: 'USDA' },
  'tomato': { cal: 22, unit: 'tomato', serving: '1 medium', source: 'USDA' },
  'tomatoes': { cal: 22, unit: 'tomato', serving: '1 medium', source: 'USDA' },
  'bell pepper': { cal: 30, unit: 'pepper', serving: '1 medium', source: 'USDA' },
  'onion': { cal: 45, unit: 'onion', serving: '1 medium', source: 'USDA' },

  // Proteins
  'scrambled eggs': { cal: 90, unit: 'egg', serving: '1 egg', source: 'USDA' },
  'hard boiled egg': { cal: 78, unit: 'egg', serving: '1 large', source: 'USDA' },
  'hardboiled egg': { cal: 78, unit: 'egg', serving: '1 large', source: 'USDA' },
  'boiled egg': { cal: 78, unit: 'egg', serving: '1 large', source: 'USDA' },
  'fried egg': { cal: 90, unit: 'egg', serving: '1 large', source: 'USDA' },
  'eggs': { cal: 70, unit: 'egg', serving: '1 large', source: 'USDA' },
  'egg': { cal: 70, unit: 'egg', serving: '1 large', source: 'USDA' },
  'chicken breast': { cal: 280, unit: 'breast', serving: '1 breast (~6oz)', source: 'USDA' },
  'grilled chicken breast': { cal: 280, unit: 'breast', serving: '1 breast (~6oz)', source: 'USDA' },
  'chicken thigh': { cal: 180, unit: 'thigh', serving: '1 thigh (~4oz)', source: 'USDA' },
  'grilled chicken': { cal: 45, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'chicken': { cal: 45, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'salmon': { cal: 50, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'salmon fillet': { cal: 280, unit: 'fillet', serving: '1 fillet (~6oz)', source: 'USDA' },
  'tuna': { cal: 30, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'steak': { cal: 270, unit: 'oz', serving: '6 oz', source: 'USDA' },
  'ground beef': { cal: 70, unit: 'oz', serving: '1 oz (cooked)', source: 'USDA' },
  'beef': { cal: 65, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'turkey': { cal: 40, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'bacon': { cal: 45, unit: 'slice', serving: '1 slice', source: 'USDA' },
  'tofu': { cal: 20, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'shrimp': { cal: 25, unit: 'oz', serving: '1 oz', source: 'USDA' },

  // Grains
  'oatmeal': { cal: 150, unit: 'cup', serving: '1 cup cooked', source: 'USDA', isComposite: true },
  'oats': { cal: 150, unit: 'cup', serving: '1 cup cooked', source: 'USDA' },
  'rice': { cal: 200, unit: 'cup', serving: '1 cup cooked', source: 'USDA' },
  'brown rice': { cal: 220, unit: 'cup', serving: '1 cup cooked', source: 'USDA' },
  'quinoa': { cal: 220, unit: 'cup', serving: '1 cup cooked', source: 'USDA' },
  'pasta': { cal: 200, unit: 'cup', serving: '1 cup cooked', source: 'USDA' },
  'bread': { cal: 80, unit: 'slice', serving: '1 slice', source: 'USDA' },
  'toast': { cal: 80, unit: 'slice', serving: '1 slice', source: 'USDA' },
  'bagel': { cal: 280, unit: 'bagel', serving: '1 medium', source: 'USDA' },
  'tortilla': { cal: 90, unit: 'tortilla', serving: '1 medium', source: 'USDA' },
  'pancake': { cal: 90, unit: 'pancake', serving: '1 medium', source: 'USDA' },
  'pancakes': { cal: 90, unit: 'pancake', serving: '1 medium', source: 'USDA' },
  'waffle': { cal: 220, unit: 'waffle', serving: '1 large', source: 'USDA' },
  'cereal': { cal: 150, unit: 'cup', serving: '1 cup with milk', source: 'USDA' },
  'granola': { cal: 140, unit: 'cup', serving: '1/4 cup', source: 'USDA' },
  'potato': { cal: 160, unit: 'potato', serving: '1 medium', source: 'USDA' },
  'sweet potato': { cal: 100, unit: 'potato', serving: '1 medium', source: 'USDA' },

  // Nuts & Nut butters
  'peanut butter': { cal: 95, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'almond butter': { cal: 100, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'almonds': { cal: 165, unit: 'oz', serving: '1 oz (~23)', source: 'USDA' },
  'peanuts': { cal: 170, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'walnuts': { cal: 185, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'cashews': { cal: 160, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'pecans': { cal: 195, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'pistachios': { cal: 160, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'mixed nuts': { cal: 170, unit: 'oz', serving: '1 oz', source: 'USDA' },

  // Legumes & Beans
  'chickpeas': { cal: 65, unit: 'handful', serving: '1/4 cup', source: 'USDA' },
  'garbanzo beans': { cal: 65, unit: 'handful', serving: '1/4 cup', source: 'USDA' },
  'black beans': { cal: 110, unit: 'cup', serving: '1/2 cup', source: 'USDA' },
  'kidney beans': { cal: 110, unit: 'cup', serving: '1/2 cup', source: 'USDA' },
  'lentils': { cal: 115, unit: 'cup', serving: '1/2 cup cooked', source: 'USDA' },
  'edamame': { cal: 95, unit: 'cup', serving: '1/2 cup shelled', source: 'USDA' },

  // Condiments & Dressings
  'honey': { cal: 60, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'maple syrup': { cal: 50, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'butter': { cal: 100, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'olive oil': { cal: 120, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'coconut oil': { cal: 120, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'oil': { cal: 120, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'cocoa powder': { cal: 12, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'cocoa': { cal: 12, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'french dressing': { cal: 70, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'ranch dressing': { cal: 75, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'ranch': { cal: 75, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'italian dressing': { cal: 35, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'caesar dressing': { cal: 80, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'balsamic vinaigrette': { cal: 45, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'vinaigrette': { cal: 45, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'dressing': { cal: 70, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'mayo': { cal: 90, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'mayonnaise': { cal: 90, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'hummus': { cal: 25, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'salsa': { cal: 5, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'guacamole': { cal: 25, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },
  'sour cream': { cal: 30, unit: 'tbsp', serving: '1 tbsp', source: 'USDA' },

  // Beverages
  'coffee': { cal: 5, unit: 'cup', serving: '1 cup black', source: 'USDA' },
  'latte': { cal: 190, unit: 'cup', serving: '12 oz', source: 'Starbucks' },
  'orange juice': { cal: 110, unit: 'cup', serving: '8 oz', source: 'USDA' },
  'juice': { cal: 120, unit: 'cup', serving: '8 oz', source: 'USDA' },

  // Snacks
  'protein bar': { cal: 220, unit: 'bar', serving: '1 bar', source: 'Typical label' },
  'granola bar': { cal: 140, unit: 'bar', serving: '1 bar', source: 'USDA' },
  'chips': { cal: 150, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'dark chocolate': { cal: 170, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'chocolate': { cal: 150, unit: 'oz', serving: '1 oz', source: 'USDA' },
  'ice cream': { cal: 250, unit: 'cup', serving: '1/2 cup', source: 'USDA' },
  'cookie': { cal: 100, unit: 'cookie', serving: '1 medium', source: 'USDA' },
  'cookies': { cal: 100, unit: 'cookie', serving: '1 medium', source: 'USDA' },

  // Composite meals (only used if no ingredients listed)
  'smoothie': { cal: 300, unit: 'smoothie', serving: '16 oz', source: 'Estimated', isComposite: true },
  'shake': { cal: 300, unit: 'shake', serving: '16 oz', source: 'Estimated', isComposite: true },
  'sandwich': { cal: 400, unit: 'sandwich', serving: '1 sandwich', source: 'Estimated', isComposite: true },
  'burger': { cal: 550, unit: 'burger', serving: '1 with bun', source: 'Estimated', isComposite: true },
  'burrito': { cal: 500, unit: 'burrito', serving: '1 burrito', source: 'Estimated', isComposite: true },
  'taco': { cal: 200, unit: 'taco', serving: '1 taco', source: 'USDA', isComposite: true },
  'tacos': { cal: 200, unit: 'taco', serving: '1 taco', source: 'USDA', isComposite: true },
  'pizza': { cal: 280, unit: 'slice', serving: '1 slice', source: 'USDA', isComposite: true },
  'salad': { cal: 150, unit: 'salad', serving: '1 side salad', source: 'Estimated', isComposite: true },
  'soup': { cal: 150, unit: 'cup', serving: '1 cup', source: 'USDA', isComposite: true },
  'bowl': { cal: 450, unit: 'bowl', serving: '1 bowl', source: 'Estimated', isComposite: true },
  'wrap': { cal: 350, unit: 'wrap', serving: '1 wrap', source: 'Estimated', isComposite: true },
  'plate': { cal: 500, unit: 'plate', serving: '1 plate', source: 'Estimated', isComposite: true },
  'stir fry': { cal: 400, unit: 'serving', serving: '1 serving', source: 'Estimated', isComposite: true },
  'stir-fry': { cal: 400, unit: 'serving', serving: '1 serving', source: 'Estimated', isComposite: true },
  'parfait': { cal: 300, unit: 'parfait', serving: '1 parfait', source: 'Estimated', isComposite: true },
  'omelette': { cal: 250, unit: 'omelette', serving: '1 omelette', source: 'Estimated', isComposite: true },
  'omelet': { cal: 250, unit: 'omelet', serving: '1 omelet', source: 'Estimated', isComposite: true },
};

/**
 * Convert number words to digits in text
 */
function convertNumberWords(text) {
  let result = text.toLowerCase();

  // Handle multi-word numbers first (longest match first)
  const sortedNumbers = Object.entries(NUMBER_WORDS).sort((a, b) => b[0].length - a[0].length);

  for (const [word, num] of sortedNumbers) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), num.toString());
  }

  // Handle fractions
  result = result.replace(/\b1\/2\b/g, '0.5');
  result = result.replace(/\b1\/4\b/g, '0.25');
  result = result.replace(/\b3\/4\b/g, '0.75');
  result = result.replace(/\b1\/3\b/g, '0.33');
  result = result.replace(/\b2\/3\b/g, '0.67');

  // Handle compound quantities: "N and a half" → N.5
  result = result.replace(/(\d+\.?\d*)\s+and\s+(?:a\s+)?half/gi, (_, n) => {
    return String(parseFloat(n) + 0.5);
  });

  // Handle "N and a quarter" → N.25
  result = result.replace(/(\d+\.?\d*)\s+and\s+(?:a\s+)?quarter/gi, (_, n) => {
    return String(parseFloat(n) + 0.25);
  });

  // Handle "N and a third" → N.33
  result = result.replace(/(\d+\.?\d*)\s+and\s+(?:a\s+)?third/gi, (_, n) => {
    return String(parseFloat(n) + 0.33);
  });

  // Handle "quarter of a/an" → 0.25
  result = result.replace(/\bquarter\s+of\s+(?:a|an)\b/gi, '0.25');

  // Handle "a third of a/an" → 0.33
  result = result.replace(/\b0\.33\s+of\s+(?:a|an)\b/gi, '0.33');

  return result;
}

/**
 * Normalize unit to standard form
 */
function normalizeUnit(unit) {
  if (!unit) return null;
  return UNIT_MAP[unit.toLowerCase()] || unit.toLowerCase();
}

/**
 * Convert quantity between units
 * Returns { quantity, unit } with the target unit
 */
function convertUnits(quantity, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) {
    return { quantity, unit: toUnit || fromUnit };
  }

  // Conversion factors
  const conversions = {
    'lb_to_oz': 16,      // 1 lb = 16 oz
    'oz_to_lb': 1/16,
    'tbsp_to_tsp': 3,    // 1 tbsp = 3 tsp
    'tsp_to_tbsp': 1/3,
    'cup_to_tbsp': 16,   // 1 cup = 16 tbsp
    'tbsp_to_cup': 1/16,
    'cup_to_oz': 8,      // 1 cup = 8 fl oz (volume)
    'oz_to_cup': 1/8,
  };

  const key = `${fromUnit}_to_${toUnit}`;
  if (conversions[key]) {
    return { quantity: quantity * conversions[key], unit: toUnit };
  }

  // No conversion found, return original
  return { quantity, unit: fromUnit };
}

/**
 * Split entry into individual ingredient segments
 */
function splitIntoSegments(text) {
  // Split by common delimiters: comma, period, semicolon, "and", "with", newline
  // Be careful not to replace periods that are part of decimal numbers (e.g., ".5" or "0.5")
  let segments = text
    .replace(/\band\b/gi, ',')
    .replace(/\bwith\b/gi, ',')  // Handle "scrambled eggs with spinach"
    .replace(/\bplus\b/gi, ',')  // Handle "eggs plus cheese"
    .replace(/\badded\b/gi, ',') // Handle "added spinach"
    // Only replace periods that are sentence-ending (followed by space+letter or end of string)
    // NOT periods in decimals like ".5" or "0.5"
    .replace(/\.(?=\s+[a-zA-Z]|$)/g, ',')
    .replace(/;/g, ',')
    .replace(/\n/g, ',')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return segments;
}

/**
 * Parse a single ingredient segment into quantity, unit, and food
 */
function stripDescriptionWords(text) {
  // Remove leading description words from segment
  const words = text.split(/\s+/);
  let startIdx = 0;
  while (startIdx < words.length - 1 && DESCRIPTION_WORDS.has(words[startIdx].toLowerCase())) {
    startIdx++;
  }
  return startIdx > 0 ? words.slice(startIdx).join(' ') : text;
}

function parseSegment(segment) {
  const text = convertNumberWords(segment.trim());

  // Check if original segment had an informal quantity word
  const lowerOriginal = segment.toLowerCase().trim();
  const informalWord = [...INFORMAL_QUANTITY_WORDS].find(w => lowerOriginal.startsWith(w));
  const hadInformalQuantity = !!informalWord;

  // Pattern: [quantity] [unit] (of) [food]
  // Examples: "2 tbsp of peanut butter", "1.5 cups almond milk", "1 banana", ".5 pounds beef"
  // Note: \.?\d+ handles decimals with or without leading zero (.5 or 0.5)
  const unitPattern = /^(\.?\d+\.?\d*)\s*(tablespoons?|tbsp|teaspoons?|tsp|cups?|oz|ounces?|pounds?|lbs?|lb|grams?|g|scoops?|handfuls?|spoonfuls?|pieces?|slices?|strips?|servings?|glasses?|breasts?|thighs?|fillets?)?\s*(?:of\s+)?(.+)$/i;

  const match = text.match(unitPattern);

  if (match) {
    const quantity = parseFloat(match[1]) || 1;
    const unit = normalizeUnit(match[2]);
    let food = match[3].trim();

    // Clean up parenthetical info like "(85/15)" from food name
    food = food.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

    // Strip description words from food name
    food = stripDescriptionWords(food);

    return { quantity, unit, food, original: segment, hadExplicitQuantity: true, hadInformalQuantity, informalWord };
  }

  // No quantity found - strip description words and return
  let food = stripDescriptionWords(text.trim());
  return { quantity: 1, unit: null, food, original: segment, hadExplicitQuantity: false, hadInformalQuantity, informalWord };
}

/**
 * Find the best matching food in the database
 */
function findFood(foodText) {
  const normalized = foodText.toLowerCase().trim();

  // Direct match
  if (FOOD_DATABASE[normalized]) {
    return { name: normalized, data: FOOD_DATABASE[normalized] };
  }

  // Sort foods by length (longest first) for best matching
  const sortedFoods = Object.keys(FOOD_DATABASE).sort((a, b) => b.length - a.length);

  // Look for the longest matching food name in the text
  for (const foodName of sortedFoods) {
    if (normalized.includes(foodName)) {
      return { name: foodName, data: FOOD_DATABASE[foodName] };
    }
  }

  // No match found
  return null;
}

/**
 * Check if entry contains ingredient list (has delimiters or "with")
 */
function hasIngredientList(text) {
  const lower = text.toLowerCase();
  return lower.includes(',') ||
         lower.includes(' and ') ||
         lower.includes(' with ') ||
         lower.includes(':') ||
         lower.includes(';');
}

/**
 * Smart deduplication using substring and word overlap detection
 */
function deduplicateItems(items) {
  if (items.length <= 1) return items;

  // Sort by food name length (longest first)
  const sorted = [...items].sort((a, b) => b.food.length - a.food.length);
  const unique = [];

  for (const item of sorted) {
    const itemFoodLower = item.food.toLowerCase();
    const itemWords = itemFoodLower.split(/\s+/).filter(w => w.length > 2);

    let isDuplicate = false;

    for (const existing of unique) {
      const existingFoodLower = existing.food.toLowerCase();
      const existingWords = existingFoodLower.split(/\s+/).filter(w => w.length > 2);

      // Check 1: Is this item's food a substring of existing food?
      if (existingFoodLower.includes(itemFoodLower)) {
        isDuplicate = true;
        // Add this item's quantity to existing if same unit
        if (item.unit === existing.unit || !item.unit) {
          // Don't double count - the longer name already captured it
        }
        break;
      }

      // Check 2: Is existing food a substring of this item's food?
      if (itemFoodLower.includes(existingFoodLower)) {
        // Replace shorter with longer
        const idx = unique.indexOf(existing);
        unique.splice(idx, 1);
        break;
      }

      // Check 3: Word overlap >= 50%
      if (itemWords.length > 0 && existingWords.length > 0) {
        const overlap = itemWords.filter(w => existingWords.includes(w)).length;
        const minWords = Math.min(itemWords.length, existingWords.length);
        const overlapPercent = overlap / minWords;

        if (overlapPercent >= 0.5) {
          isDuplicate = true;
          break;
        }
      }

      // Check 4: Brand name combined with generic (e.g., "vega" + "protein powder")
      const isBrand = BRAND_NAMES.has(itemFoodLower);
      const existingIsBrand = BRAND_NAMES.has(existingFoodLower);

      if (isBrand || existingIsBrand) {
        // Check if one is a brand and the other contains related product words
        const productWords = ['protein', 'yogurt', 'milk', 'bar', 'powder', 'shake'];
        const itemHasProduct = productWords.some(p => itemFoodLower.includes(p));
        const existingHasProduct = productWords.some(p => existingFoodLower.includes(p));

        if ((isBrand && existingHasProduct) || (existingIsBrand && itemHasProduct)) {
          // These are likely the same item (brand + generic)
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      unique.push(item);
    }
  }

  return unique;
}

/**
 * Main calorie estimation function
 */
export function estimateCalories(text) {
  if (!text || typeof text !== 'string') {
    return { totalCalories: 0, items: [], tips: [], confidence: 'low' };
  }

  const hasIngredients = hasIngredientList(text);
  const segments = splitIntoSegments(text);
  const parsedItems = [];
  const tips = new Set();

  for (const segment of segments) {
    const parsed = parseSegment(segment);

    // Find matching food
    const foodMatch = findFood(parsed.food);

    if (foodMatch) {
      const { name: foodName, data: foodData } = foodMatch;

      // Skip composite items if ingredients are listed
      if (foodData.isComposite && hasIngredients) {
        continue;
      }

      // Determine unit and quantity
      let unit = parsed.unit || foodData.unit;
      let quantity = parsed.quantity;

      // If an informal quantity word was used and it implies a specific unit,
      // use that unit and convert accordingly
      if (parsed.informalWord && INFORMAL_UNIT_MAP[parsed.informalWord] && !parsed.unit) {
        const impliedUnit = INFORMAL_UNIT_MAP[parsed.informalWord];
        if (impliedUnit !== foodData.unit) {
          const converted = convertUnits(quantity, impliedUnit, foodData.unit);
          quantity = converted.quantity;
          unit = converted.unit;
        } else {
          unit = impliedUnit;
        }
      }

      // Convert units if the parsed unit differs from the database unit
      if (parsed.unit && parsed.unit !== foodData.unit) {
        const converted = convertUnits(quantity, parsed.unit, foodData.unit);
        quantity = converted.quantity;
        unit = converted.unit;
      }

      // Calculate calories
      const baseCalPerUnit = foodData.cal;
      const calories = Math.round(baseCalPerUnit * quantity);

      // Format the calculation string
      const unitPlural = quantity !== 1 && !unit.endsWith('s') ? unit + 's' : unit;
      const calculation = `${quantity % 1 === 0 ? quantity : quantity.toFixed(1)} ${quantity === 1 ? unit : unitPlural} × ${baseCalPerUnit} cal/${unit}`;

      // Determine per-item confidence
      let itemConfidence = 'high';
      let confidenceNote = null;

      if (parsed.hadInformalQuantity) {
        itemConfidence = 'medium';
        // Generate note based on the informal word
        if (parsed.informalWord === 'handful') {
          confidenceNote = 'Estimated as ~1/4 cup';
        } else if (parsed.informalWord === 'drizzle') {
          confidenceNote = 'Estimated as ~1 tsp';
        } else if (parsed.informalWord === 'splash') {
          confidenceNote = 'Estimated as ~2 tbsp';
        } else if (parsed.informalWord === 'sprinkle') {
          confidenceNote = 'Estimated as ~1/2 tbsp';
        } else if (parsed.informalWord === 'pinch') {
          confidenceNote = 'Negligible calories';
        } else if (parsed.informalWord === 'dollop') {
          confidenceNote = 'Estimated as ~2 tbsp';
        } else if (parsed.informalWord === 'dash') {
          confidenceNote = 'Estimated as ~1/4 tsp';
        } else if (parsed.informalWord === 'some') {
          confidenceNote = 'Assumed 1 serving';
        }
      } else if (!parsed.hadExplicitQuantity) {
        itemConfidence = 'medium';
        confidenceNote = `Assumed 1 ${unit}`;
      }

      parsedItems.push({
        food: foodName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        calories,
        quantity,
        unit,
        calculation,
        source: foodData.source,
        sourceUrl: SOURCE_URLS[foodData.source] || null,
        baseServing: foodData.serving,
        itemConfidence,
        confidenceNote,
      });

      // Add tips for calorie-dense items
      if (foodData.cal >= 100 && ['tbsp', 'oz'].includes(unit)) {
        tips.add(`${foodName.charAt(0).toUpperCase() + foodName.slice(1)} is calorie-dense at ${foodData.cal} cal per ${unit}.`);
      }
    }
  }

  // Deduplicate items
  const uniqueItems = deduplicateItems(parsedItems);

  // Calculate total
  const totalCalories = uniqueItems.reduce((sum, item) => sum + item.calories, 0);

  // Determine confidence
  let confidence = 'low';
  if (uniqueItems.length >= 3) {
    confidence = 'high';
  } else if (uniqueItems.length >= 1) {
    confidence = 'medium';
  }

  return {
    totalCalories,
    items: uniqueItems,
    tips: Array.from(tips),
    confidence,
    matchedFoods: uniqueItems.length,
  };
}

/**
 * Check if a food description contains vague quantities
 */
export function needsClarification(text) {
  if (!text || typeof text !== 'string') return null;

  const normalizedText = text.toLowerCase();

  const vaguePatterns = [
    {
      pattern: /handful\s+(?:of\s+)?(\w+)/i,
      question: (match) => `You mentioned "a handful of ${match}" - roughly how much?`,
      options: [
        { label: 'Small (about 0.5 oz)', multiplier: 0.5 },
        { label: 'Medium (about 1 oz)', multiplier: 1 },
        { label: 'Large (about 1.5 oz)', multiplier: 1.5 },
      ],
    },
    {
      pattern: /(?:some|a\s+bit\s+of|a\s+little)\s+(\w+)/i,
      question: (match) => `You mentioned "some ${match}" - roughly how much?`,
      options: [
        { label: 'Small portion', multiplier: 0.5 },
        { label: 'Medium portion', multiplier: 1 },
        { label: 'Large portion', multiplier: 1.5 },
      ],
    },
  ];

  for (const { pattern, question, options } of vaguePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      return {
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
 */
export function getEducationalTip(category) {
  const tips = {
    nuts: 'Nuts are nutrient-dense but calorie-dense too! A small handful (1 oz) of almonds has about 165 calories.',
    condiment: 'Condiments and oils can add up quickly. Measure your portions to stay on track.',
    protein: 'Protein helps with satiety and muscle recovery. Aim for a palm-sized portion per meal.',
  };

  return tips[category] || null;
}
