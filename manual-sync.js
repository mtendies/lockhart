(async function syncAllDataToSupabase() {
  console.log("=== STARTING MANUAL SYNC TO SUPABASE ===");

  var supabaseModule = await import("/src/lib/supabase.js");
  var supabase = supabaseModule.supabase;

  var authResult = await supabase.auth.getUser();
  var user = authResult.data.user;
  if (!user) {
    console.error("Not logged in! Please sign in first.");
    return;
  }
  console.log("User ID: " + user.id);
  console.log("Email: " + user.email);

  var activeProfileId = localStorage.getItem("health-advisor-active-profile") || "profile_main";
  console.log("Active profile: " + activeProfileId);

  function getData(key) {
    var fullKey = activeProfileId + ":" + key;
    var data = localStorage.getItem(fullKey);
    if (!data) return null;
    try { return JSON.parse(data); } catch(e) { return null; }
  }

  var successList = [];
  var failedList = [];

  // 1. SYNC PROFILE
  console.log("\n--- Syncing Profile ---");
  var profile = getData("health-advisor-profile");
  if (profile) {
    console.log("Found profile: " + profile.name);

    var dbProfile = {
      id: user.id,
      email: user.email,
      name: profile.name,
      age: profile.age ? Number(profile.age) : null,
      sex: profile.sex,
      height_feet: profile.heightFeet || (profile.height ? Math.floor(Number(profile.height) / 12) : null),
      height_inches: profile.heightInches || (profile.height ? Number(profile.height) % 12 : null),
      weight: profile.weight ? Number(profile.weight) : null,
      goals: profile.goals,
      exercise_types: profile.exercises,
      dietary_preferences: profile.restrictions,
      meal_cadence: profile.mealPattern,
      onboarding_complete: true,
      full_profile: profile,
      updated_at: new Date().toISOString()
    };

    var profileResult = await supabase.from("users_profile").upsert(dbProfile);
    if (profileResult.error) {
      console.error("Profile sync failed: " + profileResult.error.message);
      failedList.push("Profile");
    } else {
      console.log("Profile synced successfully!");
      successList.push("Profile");
    }
  } else {
    console.log("No profile found in localStorage");
  }

  // 2. SYNC PLAYBOOK
  console.log("\n--- Syncing Playbook ---");
  var playbook = getData("health-advisor-playbook");
  if (playbook) {
    var dbPlaybook = {
      user_id: user.id,
      summary: playbook.summary,
      focus_goals: playbook.weeklyFocus,
      key_principles: playbook.principles,
      on_your_radar: playbook.radar,
      pending_suggestions: playbook.pendingSuggestions,
      generated_at: playbook.generatedAt,
      last_modified: playbook.lastModified || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    var playbookResult = await supabase.from("playbook").upsert(dbPlaybook, { onConflict: "user_id" });
    if (playbookResult.error) {
      console.error("Playbook sync failed: " + playbookResult.error.message);
      failedList.push("Playbook");
    } else {
      console.log("Playbook synced!");
      successList.push("Playbook");
    }
  }

  // 3. SYNC CONVERSATIONS
  console.log("\n--- Syncing Conversations ---");
  var chats = getData("health-advisor-chats");
  if (chats && chats.length > 0) {
    var chatSuccess = 0;
    var chatFailed = 0;
    for (var i = 0; i < chats.length; i++) {
      var chat = chats[i];
      var dbChat = {
        user_id: user.id,
        title: chat.title || "Chat",
        messages: chat.messages || [],
        bookmarks: chat.bookmarks || [],
        archived: chat.archived || false,
        last_activity: chat.lastActivity || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (chat.id && chat.id.length === 36 && chat.id.indexOf("-") > -1) {
        dbChat.id = chat.id;
      }

      var chatResult = await supabase.from("chat_conversations").upsert(dbChat, { onConflict: "id" });
      if (chatResult.error) {
        chatFailed++;
        console.error("Chat failed: " + chat.title + " - " + chatResult.error.message);
      } else {
        chatSuccess++;
      }
    }
    console.log("Conversations: " + chatSuccess + " synced, " + chatFailed + " failed");
    if (chatSuccess > 0) successList.push(chatSuccess + " Conversations");
  }

  // 4. SYNC ACTIVITIES
  console.log("\n--- Syncing Activities ---");
  var activities = getData("health-advisor-activities");
  if (activities && activities.length > 0) {
    var actSuccess = 0;
    for (var j = 0; j < activities.length; j++) {
      var activity = activities[j];
      var dbActivity = {
        user_id: user.id,
        type: activity.type,
        sub_type: activity.subType,
        category: activity.category,
        description: activity.summary || activity.description || activity.rawText,
        data: activity.data || {},
        raw_text: activity.rawText,
        logged_at: activity.timestamp || new Date().toISOString()
      };

      var actResult = await supabase.from("activities").insert(dbActivity);
      if (!actResult.error || actResult.error.code === "23505") actSuccess++;
    }
    console.log("Activities: " + actSuccess + " synced");
    if (actSuccess > 0) successList.push(actSuccess + " Activities");
  }

  // 5. SYNC NUTRITION
  console.log("\n--- Syncing Nutrition ---");
  var nutrition = getData("health-advisor-nutrition-calibration");
  if (nutrition && nutrition.days) {
    var nutSuccess = 0;
    var dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    var dayNames = Object.keys(nutrition.days);

    for (var k = 0; k < dayNames.length; k++) {
      var dayName = dayNames[k];
      var dayData = nutrition.days[dayName];
      if (!dayData || !dayOrder[dayName]) continue;

      var today = new Date();
      var diff = dayOrder[dayName] - today.getDay();
      var targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diff);
      var dateStr = targetDate.toISOString().split("T")[0];

      var nutResult = await supabase.from("nutrition_calibration").upsert({
        user_id: user.id,
        date: dateStr,
        meals: dayData,
        complete: dayData.completed || false
      });
      if (!nutResult.error) nutSuccess++;
    }
    console.log("Nutrition days: " + nutSuccess + " synced");
    if (nutSuccess > 0) successList.push(nutSuccess + " Nutrition days");
  }

  // 6. SYNC GROCERY
  console.log("\n--- Syncing Grocery ---");
  var grocery = getData("health-advisor-groceries") || getData("health-advisor-grocery");
  if (grocery) {
    var groceryResult = await supabase.from("grocery_data").upsert({
      user_id: user.id,
      data: grocery,
      updated_at: new Date().toISOString()
    });
    if (!groceryResult.error) {
      console.log("Grocery synced!");
      successList.push("Grocery");
    }
  }

  // 7. SYNC INSIGHTS
  console.log("\n--- Syncing Insights ---");
  var insights = getData("health-advisor-learned-insights");
  if (insights && insights.length > 0) {
    var insSuccess = 0;
    for (var m = 0; m < insights.length; m++) {
      var insight = insights[m];
      var insResult = await supabase.from("advisor_learned").insert({
        user_id: user.id,
        insight: insight.text || insight.insight,
        category: insight.category,
        confidence: insight.confidence
      });
      if (!insResult.error || insResult.error.code === "23505") insSuccess++;
    }
    console.log("Insights: " + insSuccess + " synced");
    if (insSuccess > 0) successList.push(insSuccess + " Insights");
  }

  // SUMMARY
  console.log("\n========================================");
  console.log("           SYNC COMPLETE");
  console.log("========================================");
  console.log("SUCCESS: " + (successList.join(", ") || "None"));
  if (failedList.length > 0) {
    console.log("FAILED: " + failedList.join(", "));
  }
  console.log("\nNow try the app on your phone!");

  return { success: successList, failed: failedList };
})();
