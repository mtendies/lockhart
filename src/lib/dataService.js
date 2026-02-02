import { supabase } from './supabase';

// ============================================
// PROFILE OPERATIONS
// ============================================

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const upsertProfile = async (userId, profile) => {
  // Convert onboardingDepth string to integer
  const onboardingLevelMap = { 'chill': 1, 'moderate': 2, 'hardcore': 3 };
  const onboardingLevel = typeof profile.onboardingDepth === 'string'
    ? onboardingLevelMap[profile.onboardingDepth] || null
    : profile.onboardingDepth;

  // Parse numeric fields that might be strings
  const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  // Transform profile to match database schema
  const dbProfile = {
    id: userId,
    email: profile.email,
    name: profile.name,
    age: parseNum(profile.age),
    sex: profile.sex,
    height_feet: profile.heightFeet || (profile.height ? Math.floor(parseNum(profile.height) / 12) : null),
    height_inches: profile.heightInches || (profile.height ? parseNum(profile.height) % 12 : null),
    weight: parseNum(profile.weight),
    address_street: profile.addressStreet,
    address_city: profile.addressCity,
    address_state: profile.addressState,
    address_zip: profile.addressZip,
    goals: profile.goals,
    exercise_types: profile.exercises || profile.exerciseTypes,
    dietary_preferences: profile.restrictions || profile.dietaryPreferences,
    meal_cadence: profile.mealPattern || profile.mealCadence,
    onboarding_level: onboardingLevel,
    onboarding_complete: profile.onboardingComplete ?? true,
    // Store full profile as JSONB for fields not in schema
    full_profile: profile,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('users_profile')
    .upsert(dbProfile)
    .select();
  return { data, error };
};

// Transform database profile back to app format
export const transformDbProfile = (dbProfile) => {
  if (!dbProfile) return null;

  // If we have full_profile stored, use that as base
  const base = dbProfile.full_profile || {};

  return {
    ...base,
    name: dbProfile.name || base.name,
    age: dbProfile.age || base.age,
    sex: dbProfile.sex || base.sex,
    height: dbProfile.height_feet && dbProfile.height_inches
      ? (dbProfile.height_feet * 12) + dbProfile.height_inches
      : base.height,
    heightUnit: base.heightUnit || 'in',
    weight: dbProfile.weight || base.weight,
    weightUnit: base.weightUnit || 'lbs',
    goals: dbProfile.goals || base.goals || [],
    exercises: dbProfile.exercise_types || base.exercises || [],
    restrictions: dbProfile.dietary_preferences || base.restrictions,
    mealPattern: dbProfile.meal_cadence || base.mealPattern,
    onboardingDepth: dbProfile.onboarding_level || base.onboardingDepth,
    onboardingComplete: dbProfile.onboarding_complete ?? base.onboardingComplete ?? true,
  };
};

// ============================================
// ACTIVITIES OPERATIONS
// ============================================

export const getActivities = async (userId, options = {}) => {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });

  if (options.startDate) {
    query = query.gte('logged_at', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('logged_at', options.endDate);
  }
  if (options.type) {
    query = query.eq('type', options.type);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  return { data: data?.map(transformDbActivity) || [], error };
};

export const addActivity = async (userId, activity) => {
  const dbActivity = {
    user_id: userId,
    type: activity.type,
    sub_type: activity.subType,
    category: activity.category,
    description: activity.summary || activity.description || activity.rawText,
    data: activity.data || {},
    raw_text: activity.rawText,
    logged_at: activity.timestamp || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('activities')
    .insert(dbActivity)
    .select();
  return { data: data?.[0] ? transformDbActivity(data[0]) : null, error };
};

export const deleteActivity = async (activityId) => {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId);
  return { error };
};

const transformDbActivity = (dbActivity) => {
  if (!dbActivity) return null;
  return {
    id: dbActivity.id,
    type: dbActivity.type,
    subType: dbActivity.sub_type,
    category: dbActivity.category,
    summary: dbActivity.description,
    rawText: dbActivity.raw_text,
    data: dbActivity.data || {},
    timestamp: dbActivity.logged_at,
    createdAt: dbActivity.created_at,
  };
};

// ============================================
// PLAYBOOK OPERATIONS
// ============================================

export const getPlaybook = async (userId) => {
  const { data, error } = await supabase
    .from('playbook')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data: data ? transformDbPlaybook(data) : null, error };
};

export const upsertPlaybook = async (userId, playbook) => {
  const dbPlaybook = {
    user_id: userId,
    summary: playbook.summary,
    focus_goals: playbook.weeklyFocus,
    key_principles: playbook.principles,
    on_your_radar: playbook.radar,
    pending_suggestions: playbook.pendingSuggestions,
    generated_at: playbook.generatedAt,
    last_modified: playbook.lastModified || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('playbook')
    .upsert(dbPlaybook, { onConflict: 'user_id' })
    .select();
  return { data: data?.[0] ? transformDbPlaybook(data[0]) : null, error };
};

const transformDbPlaybook = (dbPlaybook) => {
  if (!dbPlaybook) return null;
  return {
    summary: dbPlaybook.summary,
    weeklyFocus: dbPlaybook.focus_goals || [],
    principles: dbPlaybook.key_principles || [],
    radar: dbPlaybook.on_your_radar || [],
    pendingSuggestions: dbPlaybook.pending_suggestions || [],
    generatedAt: dbPlaybook.generated_at,
    lastModified: dbPlaybook.last_modified,
  };
};

// ============================================
// NUTRITION CALIBRATION OPERATIONS
// ============================================

// ============================================
// NUTRITION CALIBRATION - Stored in users_profile.nutrition_data
// Simple approach: Store exact localStorage format as JSONB blob
// ============================================

export const getNutritionCalibration = async (userId) => {
  // Nutrition is now stored in users_profile.nutrition_data
  // Just fetch the profile and return the nutrition_data field
  const { data, error } = await supabase
    .from('users_profile')
    .select('nutrition_data')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[dataService] Error fetching nutrition:', error);
    return { data: null, error };
  }

  console.log('[dataService] Nutrition data from profile:', data?.nutrition_data ? 'EXISTS' : 'NULL');
  return { data: data?.nutrition_data || null, error: null };
};

export const upsertNutritionCalibration = async (userId, calibrationData) => {
  if (!calibrationData) return { data: null, error: 'No calibration data' };

  console.log('[dataService] Saving nutrition to users_profile.nutrition_data');

  const { data, error } = await supabase
    .from('users_profile')
    .update({
      nutrition_data: calibrationData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select();

  if (error) {
    console.error('[dataService] Error saving nutrition:', error);
  } else {
    console.log('[dataService] Nutrition saved to profile successfully');
  }

  return { data, error };
};

// Legacy function - no longer used but kept for compatibility
export const upsertNutritionDay = async () => {
  return { data: null, error: null };
};

// ============================================
// WEEKLY CHECK-INS OPERATIONS
// ============================================

export const getCheckins = async (userId, options = {}) => {
  let query = supabase
    .from('weekly_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  return { data: data?.map(transformDbCheckin) || [], error };
};

export const upsertCheckin = async (userId, checkin) => {
  const dbCheckin = {
    user_id: userId,
    week_start: checkin.weekStart || checkin.weekOf,
    week_end: checkin.weekEnd,
    summary: checkin.summary,
    focus_goal_review: checkin.focusResponses,
    quick_answers: {
      energy: checkin.energy,
      sleepQuality: checkin.sleepQuality,
      stress: checkin.stress,
    },
    suggestions: checkin.suggestions,
    feedback_detail_level: checkin.detailPreference,
    feedback_text: checkin.openReflection,
    completed_at: checkin.completedAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('weekly_checkins')
    .upsert(dbCheckin)
    .select();
  return { data: data?.[0] ? transformDbCheckin(data[0]) : null, error };
};

const transformDbCheckin = (dbCheckin) => {
  if (!dbCheckin) return null;
  return {
    id: dbCheckin.id,
    weekOf: dbCheckin.week_start,
    weekStart: dbCheckin.week_start,
    weekEnd: dbCheckin.week_end,
    summary: dbCheckin.summary,
    focusResponses: dbCheckin.focus_goal_review || {},
    energy: dbCheckin.quick_answers?.energy,
    sleepQuality: dbCheckin.quick_answers?.sleepQuality,
    stress: dbCheckin.quick_answers?.stress,
    suggestions: dbCheckin.suggestions || [],
    detailPreference: dbCheckin.feedback_detail_level,
    openReflection: dbCheckin.feedback_text,
    completedAt: dbCheckin.completed_at,
  };
};

// ============================================
// CHAT CONVERSATIONS OPERATIONS
// ============================================

export const getConversations = async (userId, options = {}) => {
  let query = supabase
    .from('chat_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (options.archived !== undefined) {
    query = query.eq('archived', options.archived);
  }

  const { data, error } = await query;
  return { data: data?.map(transformDbConversation) || [], error };
};

export const getConversation = async (conversationId) => {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  return { data: data ? transformDbConversation(data) : null, error };
};

export const upsertConversation = async (userId, conversation) => {
  // Validate that ID is a valid UUID if present
  const isValidUUID = (id) => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const dbConversation = {
    user_id: userId,
    title: conversation.title || 'New Chat',
    category: conversation.category || null,
    messages: conversation.messages || [],
    bookmarks: conversation.bookmarks || [],
    archived: conversation.archived || false,
    last_activity: conversation.lastActivity || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Only include id if it's a valid UUID
  if (isValidUUID(conversation.id)) {
    dbConversation.id = conversation.id;
  }

  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .upsert(dbConversation, { onConflict: 'id' })
      .select();
    return { data: data?.[0] ? transformDbConversation(data[0]) : null, error };
  } catch (err) {
    console.error('[dataService] upsertConversation error:', err);
    return { data: null, error: err };
  }
};

export const deleteConversation = async (conversationId) => {
  const { error } = await supabase
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId);
  return { error };
};

const transformDbConversation = (dbConv) => {
  if (!dbConv) return null;
  return {
    id: dbConv.id,
    title: dbConv.title,
    category: dbConv.category,
    messages: dbConv.messages || [],
    bookmarks: dbConv.bookmarks || [],
    archived: dbConv.archived,
    lastActivity: dbConv.last_activity || dbConv.updated_at,
    createdAt: dbConv.created_at,
  };
};

// ============================================
// LEARNED INSIGHTS OPERATIONS
// ============================================

export const getLearnedInsights = async (userId) => {
  const { data, error } = await supabase
    .from('advisor_learned')
    .select('*')
    .eq('user_id', userId)
    .order('learned_at', { ascending: false });
  return { data: data?.map(transformDbInsight) || [], error };
};

export const addLearnedInsight = async (userId, insight) => {
  const dbInsight = {
    user_id: userId,
    insight: insight.text,
    category: insight.category,
    confidence: insight.confidence,
    source_chat_id: insight.sourceChatId,
    source_message_index: insight.sourceMessageIndex,
  };

  const { data, error } = await supabase
    .from('advisor_learned')
    .insert(dbInsight)
    .select();
  return { data: data?.[0] ? transformDbInsight(data[0]) : null, error };
};

export const deleteLearnedInsight = async (insightId) => {
  const { error } = await supabase
    .from('advisor_learned')
    .delete()
    .eq('id', insightId);
  return { error };
};

const transformDbInsight = (dbInsight) => {
  if (!dbInsight) return null;
  return {
    id: dbInsight.id,
    text: dbInsight.insight,
    category: dbInsight.category,
    confidence: dbInsight.confidence,
    sourceChatId: dbInsight.source_chat_id,
    sourceMessageIndex: dbInsight.source_message_index,
    learnedAt: dbInsight.learned_at,
  };
};

// ============================================
// ADVISOR NOTES OPERATIONS
// ============================================

export const getNotes = async (userId) => {
  const { data, error } = await supabase
    .from('advisor_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { data: {}, error };

  // Group notes by section
  const grouped = {};
  (data || []).forEach((note) => {
    const section = note.section || 'general';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push({
      id: note.id,
      text: note.text,
      date: note.created_at,
    });
  });

  return { data: grouped, error: null };
};

export const addNote = async (userId, section, text) => {
  const { data, error } = await supabase
    .from('advisor_notes')
    .insert({
      user_id: userId,
      section,
      text,
    })
    .select();
  return { data, error };
};

// ============================================
// GROCERY DATA OPERATIONS
// ============================================

export const getGroceryData = async (userId) => {
  const { data, error } = await supabase
    .from('grocery_data')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data: data?.data || null, error };
};

export const upsertGroceryData = async (userId, groceryData) => {
  const { data, error } = await supabase
    .from('grocery_data')
    .upsert({
      user_id: userId,
      data: groceryData,
      updated_at: new Date().toISOString(),
    })
    .select();
  return { data, error };
};

// ============================================
// SYNC UTILITIES
// ============================================

// Sync all local data to Supabase
export const syncAllData = async (userId, localData) => {
  const results = {
    profile: null,
    playbook: null,
    activities: null,
    conversations: null,
    insights: null,
    errors: [],
  };

  try {
    if (localData.profile) {
      const { error } = await upsertProfile(userId, localData.profile);
      if (error) results.errors.push({ type: 'profile', error });
      else results.profile = 'synced';
    }

    if (localData.playbook) {
      const { error } = await upsertPlaybook(userId, localData.playbook);
      if (error) results.errors.push({ type: 'playbook', error });
      else results.playbook = 'synced';
    }

    if (localData.activities?.length > 0) {
      for (const activity of localData.activities) {
        const { error } = await addActivity(userId, activity);
        if (error) results.errors.push({ type: 'activity', error });
      }
      results.activities = 'synced';
    }

    if (localData.conversations?.length > 0) {
      for (const conv of localData.conversations) {
        const { error } = await upsertConversation(userId, conv);
        if (error) results.errors.push({ type: 'conversation', error });
      }
      results.conversations = 'synced';
    }

    if (localData.insights?.length > 0) {
      for (const insight of localData.insights) {
        const { error } = await addLearnedInsight(userId, insight);
        if (error) results.errors.push({ type: 'insight', error });
      }
      results.insights = 'synced';
    }
  } catch (err) {
    results.errors.push({ type: 'general', error: err });
  }

  return results;
};

// Load all user data from Supabase
export const loadAllData = async (userId) => {
  const results = {
    profile: null,
    playbook: null,
    activities: [],
    conversations: [],
    insights: [],
    checkins: [],
    nutritionCalibration: null,
    notes: {},
    grocery: null,
    errors: [],
  };

  try {
    const [
      profileResult,
      playbookResult,
      activitiesResult,
      conversationsResult,
      insightsResult,
      checkinsResult,
      nutritionResult,
      notesResult,
      groceryResult,
    ] = await Promise.all([
      getProfile(userId),
      getPlaybook(userId),
      getActivities(userId),
      getConversations(userId),
      getLearnedInsights(userId),
      getCheckins(userId, { limit: 10 }),
      getNutritionCalibration(userId),
      getNotes(userId),
      getGroceryData(userId),
    ]);

    if (profileResult.data) results.profile = transformDbProfile(profileResult.data);
    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      results.errors.push({ type: 'profile', error: profileResult.error });
    }

    if (playbookResult.data) results.playbook = playbookResult.data;
    if (playbookResult.error && playbookResult.error.code !== 'PGRST116') {
      results.errors.push({ type: 'playbook', error: playbookResult.error });
    }

    results.activities = activitiesResult.data || [];
    results.conversations = conversationsResult.data || [];
    results.insights = insightsResult.data || [];
    results.checkins = checkinsResult.data || [];
    results.nutritionCalibration = nutritionResult.data;
    results.notes = notesResult.data || {};
    results.grocery = groceryResult.data;
  } catch (err) {
    results.errors.push({ type: 'general', error: err });
  }

  return results;
};
