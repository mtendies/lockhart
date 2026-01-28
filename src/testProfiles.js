/**
 * Test Profiles for Dev Tools
 * Pre-made profiles with realistic data for testing different user scenarios.
 *
 * IMPORTANT: These profiles are loaded into TEST profile slots,
 * never overwriting the user's master profile.
 */

// Helper to generate dates
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

/**
 * PROFILE 1: Active Alex
 * Advanced fitness user, similar to a hardcore fitness enthusiast
 */
export const ACTIVE_ALEX = {
  id: 'test_active_alex',
  name: 'Active Alex (Test)',
  description: 'Hardcore fitness user - weightlifting, running, yoga',
  isTest: true,

  profile: {
    name: 'Alex',
    age: '27',
    sex: 'male',
    height: '70',
    heightUnit: 'in',
    weight: '180',
    weightUnit: 'lbs',
    bodyFat: '20',
    restingHeartRate: '58',
    location: 'Austin, TX',
    streetAddress: '123 Fitness Lane',
    city: 'Austin',
    stateProvince: 'TX',
    postalCode: '78701',
    country: 'USA',
    occupation: 'Software engineer - desk job but take walking breaks',
    income: '100k_150k',
    budgetWillingness: 'generous',

    // Lifestyle
    activityLevel: 'very_active',
    activityDetail: 'Desk job but I make it a point to walk 10k steps daily. Morning gym sessions before work, running after work 3-4x week.',
    wakeTime: '05:30',
    bedTime: '22:00',
    workHours: '9am-5pm, flexible remote work',
    availableTime: 'Mornings 6-8am, evenings after 6pm',
    commute: 'Work from home most days',
    dailySteps: '10,000-12,000',
    screenTime: '8+ hours for work',
    socialSupport: 'Gym buddy for lifting, running group on weekends',
    hobbies: 'Reading, hiking, cooking, photography',
    travelFrequency: 'Monthly weekend trips',

    // Sleep
    sleepQuality: '7',
    sleepHoursWeekday: '7',
    sleepHoursWeekend: '8',
    sleepConsistency: 'mostly_consistent',
    sleepDisruptions: 'Occasionally wake up to use bathroom. Sometimes trouble falling asleep if I have coffee after 2pm.',
    preSleepHabits: 'Try to stop screens 30 min before bed, read a book. Sometimes slip and scroll phone.',
    naps: 'Rare, maybe weekend afternoon if needed',

    // Stress
    stressLevel: 'moderate',
    mentalHealth: 'Generally good. Occasional work stress but manageable.',
    stressManagement: 'Exercise is my main stress relief. Also meditation 2-3x/week using Headspace.',
    lifeStressors: 'Work deadlines, planning a move soon',
    recoveryPractices: 'Foam rolling after workouts, massage gun, occasional sauna',

    // Hydration
    waterIntake: '80-100 oz daily',
    hydrationHabits: 'Water bottle always with me',
    workoutHydration: 'LMNT during longer runs',
    electrolytes: 'Yes, LMNT or Liquid IV on training days',
    urineColor: 'Light yellow usually',
    sweatRate: 'Heavy sweater',
    alcohol: '2-3 drinks on weekends',

    // Training
    exercises: [
      { name: 'Weightlifting', frequency: 4 },
      { name: 'Running', frequency: 4 },
      { name: 'Yoga', frequency: 2 },
    ],
    trainingAge: '4 years consistently',
    trainingIntensity: 'hard',
    progressiveOverload: 'Track all lifts in Strong app. Aim to increase weight or reps each week. Currently running 531 for main lifts.',
    recoveryDays: '2 rest days per week, usually Tuesday and Sunday. Active recovery with walks.',
    injuries: 'Had minor shoulder impingement 2 years ago, fully recovered. Occasional tight hip flexors.',
    trainingProgram: '531 BBB for strength, building to 10K race in spring',
    cardioType: 'Mix of Zone 2 easy runs and tempo runs. One long run on weekends.',
    flexibilityWork: 'Yoga 2x/week, daily hip stretches',

    // Nutrition
    meals: '4-5 times a day',
    goToMeals: 'Greek yogurt with berries, chicken stir fry, salmon with rice and veggies',
    favoriteFoods: 'Steak, sushi, Thai food, burritos',
    restrictions: 'None, but trying to limit processed foods',
    proteinDistribution: 'Try to get 40g+ at each main meal',
    mealTiming: 'Breakfast 7am, Lunch 12pm, Snack 3pm, Dinner 7pm',
    prePostWorkoutNutrition: 'Banana before morning workouts, protein shake after',
    processedFood: 'Occasional, maybe 2-3 times a week',
    micronutrients: 'Vitamin D, fish oil, creatine daily',
    supplements: 'Whey protein, creatine 5g daily, vitamin D 5000IU, fish oil',
    foodQuality: 'Mostly whole foods, cook at home 5-6 nights/week',
    mealPattern: ['breakfast', 'lunch', 'snack', 'dinner'],

    // Behavioral
    motivation: 'mixed',
    pastAttempts: 'Tried keto for 3 months - lost weight but felt terrible for running. Calorie counting works but gets tedious. Currently doing intuitive eating with protein focus.',
    adherencePatterns: 'moderate',
    socialEating: '2-3x/week eating out',
    mealPrep: 'Sunday meal prep for lunches, cook dinner fresh',
    foodRelationship: 'Healthy relationship, see food as fuel and enjoyment',

    // Goals
    goals: ['Fat loss', 'Muscle gain', 'Performance'],
    goalDetails: {
      'Fat loss': 'Want to get from ~20% body fat to 12-15%. Looking for visible abs and more definition while maintaining strength.',
      'Muscle gain': 'Maintain or add muscle while cutting. Focus on bringing up lagging shoulders and back.',
      'Performance': 'Run a sub-50 minute 10K by April. Hit 315 squat, 405 deadlift.',
    },

    onboardingDepth: 'hardcore',
    onboardedAt: daysAgo(30),

    extraPersonal: 'Tech professional who takes health seriously. Want to optimize without being obsessive.',
    extraTraining: 'Been lifting for 4 years, running for 2. Ready to take both to next level.',
    extraNutrition: 'Not interested in strict diets, want sustainable approach. Flexible dieting style.',
  },

  playbook: {
    keyPrinciples: [
      {
        text: 'Prioritize protein at every meal (40g+ per main meal)',
        why: 'Supports muscle retention during fat loss and recovery from training',
      },
      {
        text: 'Maintain lifting intensity while in deficit - never sacrifice strength work',
        why: 'Muscle is metabolically active and preserving it ensures the weight lost is fat',
      },
      {
        text: 'Sleep 7+ hours consistently - this is non-negotiable',
        why: 'Recovery happens during sleep; compromising it sabotages both fat loss and performance',
      },
    ],
    weeklyFocus: [
      { action: 'Complete 4 strength training sessions this week' },
      { action: 'Run 3 times this week (2 easy, 1 tempo)' },
      { action: 'Hit protein goal (180g) at least 5 days' },
      { action: 'Get 7+ hours of sleep at least 5 nights' },
      { action: 'Do 2 yoga/mobility sessions' },
    ],
    onRadar: [
      { text: 'Watch shoulder during overhead pressing - old impingement area', priority: 'high' },
      { text: 'April 10K race - start building weekly mileage', priority: 'medium' },
      { text: 'Consider deload week in 2 weeks if feeling run down', priority: 'low' },
    ],
    generatedAt: daysAgo(14),
  },

  activities: [
    { id: 'a1', type: 'workout', subType: 'strength', rawText: 'Squats 275x5x3, leg press, leg curls', summary: 'Leg day - squats 275x5x3', data: { exercise: 'squats', weight: 275, reps: 5, sets: 3 }, timestamp: daysAgo(0), source: 'dashboard' },
    { id: 'a2', type: 'workout', subType: 'run', rawText: '5 mile easy run, 45 minutes', summary: '5 mile easy run', data: { distance: 5, duration: 45, pace: '9:00' }, timestamp: daysAgo(1), source: 'dashboard' },
    { id: 'a3', type: 'nutrition', rawText: 'Greek yogurt with berries and granola for breakfast', summary: 'Greek yogurt breakfast with berries', data: { meal: 'breakfast' }, timestamp: daysAgo(0), source: 'dashboard' },
    { id: 'a4', type: 'workout', subType: 'strength', rawText: 'Bench 205x5x3, incline dumbbell, tricep pushdowns', summary: 'Push day - bench 205x5x3', data: { exercise: 'bench', weight: 205, reps: 5, sets: 3 }, timestamp: daysAgo(2), source: 'dashboard' },
    { id: 'a5', type: 'workout', subType: 'run', rawText: 'Tempo run 4 miles at 7:30 pace', summary: 'Tempo run 4 miles', data: { distance: 4, duration: 30, pace: '7:30' }, timestamp: daysAgo(3), source: 'dashboard' },
    { id: 'a6', type: 'workout', subType: 'yoga', rawText: '30 min yoga flow with hip openers', summary: 'Yoga - hip openers', data: { duration: 30 }, timestamp: daysAgo(4), source: 'dashboard' },
    { id: 'a7', type: 'nutrition', rawText: 'Hit protein goal - had chicken, eggs, protein shake, salmon today', summary: 'Hit 180g protein goal', data: { hitProteinGoal: true }, timestamp: daysAgo(1), source: 'dashboard' },
    { id: 'a8', type: 'workout', subType: 'strength', rawText: 'Deadlift 365x3x3, barbell rows, pull-ups', summary: 'Pull day - deadlift 365x3x3', data: { exercise: 'deadlift', weight: 365, reps: 3, sets: 3 }, timestamp: daysAgo(4), source: 'dashboard' },
    { id: 'a9', type: 'sleep', rawText: 'Slept 7.5 hours, felt rested', summary: '7.5 hours sleep', data: { hours: 7.5, quality: 'good' }, timestamp: daysAgo(1), source: 'dashboard' },
    { id: 'a10', type: 'nutrition', rawText: 'Salmon, rice, and broccoli for dinner', summary: 'Salmon dinner', data: { meal: 'dinner' }, timestamp: daysAgo(2), source: 'dashboard' },
  ],

  checkIns: [
    {
      weekOf: daysAgo(7).split('T')[0],
      date: daysAgo(7),
      weight: 179,
      workouts: 8,
      energyLevel: 4,
      sleepQuality: 4,
      stressLevel: 2,
      wins: 'PR on deadlift - hit 365x3! Also ran 18 miles total this week.',
      struggles: 'Struggled with afternoon energy slump a few days.',
      notes: 'Good week overall. Need to be better about afternoon snacks.',
      entries: [],
    },
    {
      weekOf: daysAgo(14).split('T')[0],
      date: daysAgo(14),
      weight: 180,
      workouts: 7,
      energyLevel: 3,
      sleepQuality: 3,
      stressLevel: 3,
      wins: 'Stayed consistent with training despite busy work week.',
      struggles: 'Only slept 6 hours a few nights due to project deadline.',
      notes: 'Work stress impacted recovery. Need to prioritize sleep more.',
      entries: [],
    },
  ],

  nutritionCalibration: {
    startedAt: daysAgo(20),
    currentDay: 'friday',
    days: {
      monday: {
        meals: [
          { id: 'm1', type: 'breakfast', label: 'Breakfast', content: 'Greek yogurt with berries, granola, honey', order: 0 },
          { id: 'm2', type: 'lunch', label: 'Lunch', content: 'Chicken stir fry with rice and mixed vegetables', order: 1 },
          { id: 'm3', type: 'snack', label: 'Snack', content: 'Protein shake, banana', order: 2 },
          { id: 'm4', type: 'dinner', label: 'Dinner', content: 'Salmon, sweet potato, asparagus', order: 3 },
        ],
        completed: true,
        completedAt: daysAgo(19),
      },
      tuesday: {
        meals: [
          { id: 'm5', type: 'breakfast', label: 'Breakfast', content: '3 eggs scrambled, toast, avocado', order: 0 },
          { id: 'm6', type: 'lunch', label: 'Lunch', content: 'Turkey sandwich on whole wheat, apple', order: 1 },
          { id: 'm7', type: 'snack', label: 'Snack', content: 'Cottage cheese with pineapple', order: 2 },
          { id: 'm8', type: 'dinner', label: 'Dinner', content: 'Steak, mashed potatoes, green beans', order: 3 },
        ],
        completed: true,
        completedAt: daysAgo(18),
      },
      wednesday: {
        meals: [
          { id: 'm9', type: 'breakfast', label: 'Breakfast', content: 'Oatmeal with protein powder, berries', order: 0 },
          { id: 'm10', type: 'lunch', label: 'Lunch', content: 'Chipotle bowl - chicken, rice, beans, veggies', order: 1 },
          { id: 'm11', type: 'snack', label: 'Snack', content: 'Quest bar, almonds', order: 2 },
          { id: 'm12', type: 'dinner', label: 'Dinner', content: 'Homemade burgers, side salad', order: 3 },
        ],
        completed: true,
        completedAt: daysAgo(17),
      },
      thursday: {
        meals: [
          { id: 'm13', type: 'breakfast', label: 'Breakfast', content: 'Smoothie - protein, banana, spinach, almond milk', order: 0 },
          { id: 'm14', type: 'lunch', label: 'Lunch', content: 'Leftover stir fry', order: 1 },
          { id: 'm15', type: 'snack', label: 'Snack', content: 'Hard boiled eggs, cheese stick', order: 2 },
          { id: 'm16', type: 'dinner', label: 'Dinner', content: 'Grilled chicken, quinoa, roasted vegetables', order: 3 },
        ],
        completed: true,
        completedAt: daysAgo(16),
      },
      friday: {
        meals: [
          { id: 'm17', type: 'breakfast', label: 'Breakfast', content: 'Egg white omelette with veggies, toast', order: 0 },
          { id: 'm18', type: 'lunch', label: 'Lunch', content: 'Poke bowl', order: 1 },
          { id: 'm19', type: 'snack', label: 'Snack', content: 'Protein shake', order: 2 },
          { id: 'm20', type: 'dinner', label: 'Dinner', content: 'Thai food - pad thai, spring rolls', order: 3 },
        ],
        completed: true,
        completedAt: daysAgo(15),
      },
    },
    completedAt: daysAgo(15),
  },

  grocerySwaps: [
    { id: 's1', originalProduct: 'Regular pasta', newProduct: 'Banza chickpea pasta', category: 'pantry', reason: 'Higher protein', status: 'bought', createdAt: daysAgo(10) },
    { id: 's2', originalProduct: 'Mayo', newProduct: 'Greek yogurt', category: 'condiments', reason: 'Less calories, more protein', status: 'bought', createdAt: daysAgo(8) },
    { id: 's3', originalProduct: 'Ice cream', newProduct: 'Halo Top', category: 'frozen', reason: 'Lower calorie treat', status: 'pending', createdAt: daysAgo(5) },
  ],

  chatHistory: [
    { role: 'user', content: 'What should my calorie deficit be to lose fat while preserving muscle?', timestamp: daysAgo(12) },
    { role: 'assistant', content: 'Based on your profile, I recommend a moderate deficit of 300-500 calories below maintenance. At your activity level and 180 lbs, your maintenance is roughly 2,800-3,000 calories. A 400-calorie deficit (targeting 2,400-2,600 daily) would help you lose about 0.5-0.75 lbs per week while preserving muscle mass. Keep protein high at 1g per pound of bodyweight (180g) to protect muscle during the deficit.', timestamp: daysAgo(12) },
    { role: 'user', content: 'How should I time my runs around lifting?', timestamp: daysAgo(10) },
    { role: 'assistant', content: 'Great question! For optimal performance in both: 1) Lift first on days when you do both - lifting requires more CNS freshness. 2) If possible, separate them by 6+ hours or put them on different days. 3) Your current schedule of morning lifts and evening runs works well. 4) On leg day, skip the run or do very easy recovery pace. 5) Put your tempo/harder runs on days after rest or upper body days.', timestamp: daysAgo(10) },
  ],
};

/**
 * PROFILE 2: Beginner Beth
 * New to fitness, wants to lose weight and get energy
 */
export const BEGINNER_BETH = {
  id: 'test_beginner_beth',
  name: 'Beginner Beth (Test)',
  description: 'New to fitness - wants to lose weight and build habits',
  isTest: true,

  profile: {
    name: 'Beth',
    age: '35',
    sex: 'female',
    height: '66',
    heightUnit: 'in',
    weight: '165',
    weightUnit: 'lbs',
    bodyFat: '',
    restingHeartRate: '',
    location: 'Chicago, IL',
    occupation: 'Marketing manager - lots of meetings, desk work',
    income: '60k_100k',
    budgetWillingness: 'moderate',

    activityLevel: 'sedentary',
    activityDetail: 'Desk job, work from home. Barely leave the house some days.',
    wakeTime: '07:00',
    bedTime: '23:30',
    workHours: '9-6 but often work late',
    availableTime: 'Maybe lunch break, evenings after 7pm',

    sleepQuality: '5',
    sleepHoursWeekday: '6',
    sleepHoursWeekend: '8',
    sleepConsistency: 'inconsistent',

    exercises: [],
    trainingAge: 'Haven\'t exercised regularly since college',
    trainingIntensity: 'light',

    meals: '2-3 times, often skip breakfast',
    restrictions: '',
    mealPattern: ['lunch', 'dinner', 'snack'],

    goals: ['Weight loss', 'Energy'],
    goalDetails: {
      'Weight loss': 'Want to lose 20 lbs. Was 145 in college and felt great.',
      'Energy': 'Tired all the time, especially afternoon crash. Want more energy.',
    },

    onboardingDepth: 'chill',
    onboardedAt: hoursAgo(1),
  },

  // New user - no playbook yet (will be generated on first chat)
  playbook: null,
  activities: [],
  checkIns: [],
  nutritionCalibration: null,
  grocerySwaps: [],
  chatHistory: [],
};

/**
 * PROFILE 3: Marathon Mike
 * Experienced runner, training for marathon
 */
export const MARATHON_MIKE = {
  id: 'test_marathon_mike',
  name: 'Marathon Mike (Test)',
  description: 'Marathon training - focused on endurance',
  isTest: true,

  profile: {
    name: 'Mike',
    age: '42',
    sex: 'male',
    height: '69',
    heightUnit: 'in',
    weight: '160',
    weightUnit: 'lbs',
    bodyFat: '14',
    restingHeartRate: '52',
    location: 'Boston, MA',
    occupation: 'Financial analyst, hybrid work',
    income: '100k_150k',
    budgetWillingness: 'generous',

    activityLevel: 'very_active',
    activityDetail: 'Run 5-6 days a week, currently building to marathon',
    wakeTime: '05:00',
    bedTime: '21:30',
    workHours: '8-5, some flexibility',
    availableTime: 'Early mornings before work, weekends',

    sleepQuality: '8',
    sleepHoursWeekday: '7.5',
    sleepHoursWeekend: '8',
    sleepConsistency: 'very_consistent',

    exercises: [
      { name: 'Running', frequency: 6 },
      { name: 'Yoga', frequency: 2 },
    ],
    trainingAge: '8 years running, 3 marathons completed',
    trainingIntensity: 'mixed',
    trainingProgram: 'Pfitzinger 18/70 marathon plan',
    cardioType: 'Mostly Zone 2 with speed work Tuesdays, tempo Thursdays, long run Sundays',

    meals: '5-6 times a day, frequent fueling',
    restrictions: '',
    mealPattern: ['breakfast', 'snack', 'lunch', 'snack', 'dinner'],
    supplements: 'Electrolytes, vitamin D, iron',

    goals: ['Performance'],
    goalDetails: {
      'Performance': 'Boston Marathon in April - goal is sub 3:15 (BQ-10). Current PR is 3:22.',
    },

    onboardingDepth: 'moderate',
    onboardedAt: daysAgo(60),
  },

  playbook: {
    keyPrinciples: [
      { text: 'Build weekly mileage gradually - max 10% increase per week', why: 'Injury prevention is the #1 priority in marathon training' },
      { text: 'Easy runs should be truly easy - conversational pace', why: '80% of running should be aerobic to build endurance base' },
      { text: 'Fuel properly for long runs - practice race day nutrition', why: 'Gut training is as important as leg training' },
    ],
    weeklyFocus: [
      { action: 'Complete all 6 scheduled runs this week' },
      { action: 'Hit 55 miles total this week' },
      { action: 'Do Tuesday speed work: 6x800m at goal pace' },
      { action: 'Sunday long run: 18 miles with last 5 at marathon pace' },
      { action: 'Yoga or stretching at least 2 times' },
    ],
    onRadar: [
      { text: 'Boston Marathon April 15 - 10 weeks out', priority: 'high' },
      { text: 'Start tapering in 7 weeks', priority: 'medium' },
      { text: 'Book hotel near finish line', priority: 'low' },
    ],
    generatedAt: daysAgo(7),
  },

  activities: [
    { id: 'r1', type: 'workout', subType: 'run', rawText: '10 mile long run at 8:00 pace', summary: '10 mile easy run', data: { distance: 10, duration: 80, pace: '8:00' }, timestamp: daysAgo(0), source: 'dashboard' },
    { id: 'r2', type: 'workout', subType: 'run', rawText: '6x800m repeats at 3:05 each', summary: 'Speed work - 6x800m', data: { distance: 6, workout: 'intervals' }, timestamp: daysAgo(2), source: 'dashboard' },
    { id: 'r3', type: 'workout', subType: 'run', rawText: '6 miles easy recovery', summary: '6 mile recovery run', data: { distance: 6, duration: 54, pace: '9:00' }, timestamp: daysAgo(3), source: 'dashboard' },
    { id: 'r4', type: 'workout', subType: 'run', rawText: '18 mile long run with marathon pace finish', summary: '18 mile long run', data: { distance: 18, duration: 144 }, timestamp: daysAgo(7), source: 'dashboard' },
  ],

  checkIns: [
    {
      weekOf: daysAgo(7).split('T')[0],
      date: daysAgo(7),
      weight: 160,
      workouts: 6,
      energyLevel: 4,
      sleepQuality: 5,
      stressLevel: 2,
      wins: 'Nailed the 18-miler, felt strong at the end. 52 miles total.',
      struggles: 'Left calf felt tight Wednesday. Took it easy Thursday.',
      notes: 'Good week. Making sure to roll out calves daily now.',
      entries: [],
    },
  ],

  nutritionCalibration: null, // Skipped calibration
  grocerySwaps: [],
  chatHistory: [
    { role: 'user', content: 'What should I eat before my long runs?', timestamp: daysAgo(5) },
    { role: 'assistant', content: 'For long runs, eat 2-3 hours before to allow digestion. Aim for 60-80g of easily digestible carbs with minimal fat/fiber. Good options: oatmeal with banana, toast with honey and peanut butter, or a bagel with jam. During runs over 90 minutes, consume 30-60g carbs per hour via gels, chews, or sports drink. Practice this in training so your gut adapts before race day!', timestamp: daysAgo(5) },
  ],
};

/**
 * PROFILE 4: Busy Parent Pat
 * Time-constrained, wants efficient health strategies
 */
export const BUSY_PARENT_PAT = {
  id: 'test_busy_parent_pat',
  name: 'Busy Parent Pat (Test)',
  description: 'Time-constrained parent - quick, efficient health strategies',
  isTest: true,

  profile: {
    name: 'Pat',
    age: '38',
    sex: 'other',
    height: '67',
    heightUnit: 'in',
    weight: '175',
    weightUnit: 'lbs',
    location: 'Denver, CO',
    occupation: 'Project manager, 2 young kids',
    income: '60k_100k',
    budgetWillingness: 'budget',

    activityLevel: 'lightly_active',
    activityDetail: 'Chasing kids around! No formal exercise but always on the go.',
    wakeTime: '06:00',
    bedTime: '22:30',
    workHours: '8-5, no flexibility',
    availableTime: 'Maybe 20-30 min during lunch, after kids in bed at 8pm',

    sleepQuality: '4',
    sleepHoursWeekday: '6',
    sleepHoursWeekend: '6.5',
    sleepConsistency: 'inconsistent',
    sleepDisruptions: 'Kids wake up sometimes, early morning wake calls',

    exercises: [
      { name: 'Walking', frequency: 3 },
    ],
    trainingAge: 'Used to be active before kids',
    trainingIntensity: 'light',

    meals: '3 times but rushed',
    mealPattern: ['breakfast', 'lunch', 'dinner'],
    mealPrep: 'Try to Sunday prep but doesn\'t always happen',

    goals: ['Maintain health', 'Energy'],
    goalDetails: {
      'Maintain health': 'Just want to not feel like crap. Keep up with the kids.',
      'Energy': 'So tired by 3pm. Need to stop relying on coffee.',
    },

    onboardingDepth: 'chill',
    onboardedAt: daysAgo(14),
  },

  playbook: {
    keyPrinciples: [
      { text: '20 minutes counts - don\'t need an hour to exercise', why: 'Consistency with short workouts beats occasional long ones' },
      { text: 'Prep food on Sundays to avoid weekday decision fatigue', why: 'Having healthy food ready removes willpower requirements' },
      { text: 'Protect sleep even when it\'s hard - say no to late screen time', why: 'Sleep deprivation makes everything harder' },
    ],
    weeklyFocus: [
      { action: 'Three 20-minute workouts (can be walks!)' },
      { action: 'Meal prep Sunday - at least lunches for the week' },
      { action: 'In bed by 10:30pm at least 4 nights' },
    ],
    onRadar: [
      { text: 'Consider resistance bands for quick home workouts', priority: 'low' },
    ],
    generatedAt: daysAgo(10),
  },

  activities: [
    { id: 'p1', type: 'workout', subType: 'walk', rawText: '20 min walk during lunch', summary: 'Lunch walk 20 min', data: { duration: 20 }, timestamp: daysAgo(1), source: 'dashboard' },
    { id: 'p2', type: 'workout', subType: 'walk', rawText: '30 min family walk after dinner', summary: 'Family walk', data: { duration: 30 }, timestamp: daysAgo(3), source: 'dashboard' },
    { id: 'p3', type: 'nutrition', rawText: 'Meal prepped chicken and veggies for the week', summary: 'Sunday meal prep done', data: { mealPrep: true }, timestamp: daysAgo(5), source: 'dashboard' },
  ],

  checkIns: [],
  nutritionCalibration: null,
  grocerySwaps: [],
  chatHistory: [],
};

/**
 * PROFILE 5: Empty Slate
 * Completely blank profile for testing onboarding
 */
export const EMPTY_SLATE = {
  id: 'test_empty_slate',
  name: 'Empty Slate (Test)',
  description: 'Fresh start - no data, goes through onboarding',
  isTest: true,

  profile: null, // Will trigger onboarding
  playbook: null,
  activities: [],
  checkIns: [],
  nutritionCalibration: null,
  grocerySwaps: [],
  chatHistory: [],
};

/**
 * All available test profiles
 */
export const TEST_PROFILES = {
  active_alex: ACTIVE_ALEX,
  beginner_beth: BEGINNER_BETH,
  marathon_mike: MARATHON_MIKE,
  busy_parent_pat: BUSY_PARENT_PAT,
  empty_slate: EMPTY_SLATE,
};

export default TEST_PROFILES;
