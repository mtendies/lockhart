(async function syncAllFromProfileMain() {
  console.log("=== SYNCING ALL profile_main DATA TO SUPABASE ===\n");

  var supabaseModule = await import("/src/lib/supabase.js");
  var supabase = supabaseModule.supabase;
  var userId = "a7b9998f-8f4b-46d4-a5a6-ade296a1fe48";
  var prefix = "profile_main:";

  function getData(key) {
    var data = localStorage.getItem(prefix + key);
    if (!data) return null;
    try { return JSON.parse(data); } catch(e) { return null; }
  }

  var results = [];

  console.log("--- Syncing Playbook ---");
  var playbook = getData("health-advisor-playbook");
  if (playbook) {
    var playbookResult = await supabase.from("playbook").upsert({
      user_id: userId,
      summary: playbook.summary,
      focus_goals: playbook.weeklyFocus,
      key_principles: playbook.principles,
      on_your_radar: playbook.radar,
      pending_suggestions: playbook.pendingSuggestions,
      generated_at: playbook.generatedAt,
      last_modified: playbook.lastModified || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    results.push(playbookResult.error ? "Playbook: FAILED" : "Playbook: OK");
    console.log(playbookResult.error ? "FAILED: " + playbookResult.error.message : "OK");
  }

  console.log("\n--- Syncing Conversations ---");
  var chats = getData("health-advisor-chats");
  if (chats && chats.length > 0) {
    var chatOk = 0;
    var chatFail = 0;
    for (var i = 0; i < chats.length; i++) {
      var chat = chats[i];
      var dbChat = {
        user_id: userId,
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
      if (chatResult.error) { chatFail++; } else { chatOk++; }
    }
    results.push("Conversations: " + chatOk + " OK, " + chatFail + " failed");
    console.log(chatOk + " OK, " + chatFail + " failed");
  }

  console.log("\n--- Syncing Activities ---");
  var activities = getData("health-advisor-activities");
  if (activities && activities.length > 0) {
    var actOk = 0;
    for (var j = 0; j < activities.length; j++) {
      var act = activities[j];
      var actResult = await supabase.from("activities").insert({
        user_id: userId,
        type: act.type,
        sub_type: act.subType,
        category: act.category,
        description: act.summary || act.description || act.rawText,
        data: act.data || {},
        raw_text: act.rawText,
        logged_at: act.timestamp || new Date().toISOString()
      });
      if (!actResult.error || actResult.error.code === "23505") actOk++;
    }
    results.push("Activities: " + actOk + " synced");
    console.log(actOk + " synced");
  }

  console.log("\n--- Syncing Nutrition ---");
  var nutrition = getData("health-advisor-nutrition-calibration");
  if (nutrition && nutrition.days) {
    var nutOk = 0;
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
        user_id: userId,
        date: dateStr,
        meals: dayData,
        complete: dayData.completed || false
      });
      if (!nutResult.error) nutOk++;
    }
    results.push("Nutrition: " + nutOk + " days synced");
    console.log(nutOk + " days synced");
  }

  console.log("\n--- Syncing Insights ---");
  var insights = getData("health-advisor-learned-insights");
  if (insights && insights.length > 0) {
    var insOk = 0;
    for (var m = 0; m < insights.length; m++) {
      var ins = insights[m];
      var insResult = await supabase.from("advisor_learned").insert({
        user_id: userId,
        insight: ins.text || ins.insight,
        category: ins.category,
        confidence: ins.confidence
      });
      if (!insResult.error || insResult.error.code === "23505") insOk++;
    }
    results.push("Insights: " + insOk + " synced");
    console.log(insOk + " synced");
  }

  console.log("\n--- Syncing Grocery ---");
  var grocery = getData("health-advisor-groceries");
  if (grocery) {
    var groceryResult = await supabase.from("grocery_data").upsert({
      user_id: userId,
      data: grocery,
      updated_at: new Date().toISOString()
    });
    results.push(groceryResult.error ? "Grocery: FAILED" : "Grocery: OK");
    console.log(groceryResult.error ? "FAILED" : "OK");
  }

  console.log("\n========================================");
  console.log("           SYNC COMPLETE");
  console.log("========================================");
  for (var n = 0; n < results.length; n++) {
    console.log(results[n]);
  }
  console.log("\nNow test on your phone!");
})();
