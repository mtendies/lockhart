(async function fixProfile() {
  console.log("=== FIXING SUPABASE PROFILE ===\n");

  var supabaseModule = await import("/src/lib/supabase.js");
  var supabase = supabaseModule.supabase;

  var correctProfileRaw = localStorage.getItem("profile_main:health-advisor-profile");
  if (!correctProfileRaw) {
    console.error("ERROR: Could not find profile_main:health-advisor-profile");
    return;
  }

  var correctProfile = JSON.parse(correctProfileRaw);
  console.log("Correct profile from localStorage:");
  console.log("  name:", correctProfile.name);
  console.log("  age:", correctProfile.age);
  console.log("  weight:", correctProfile.weight);
  console.log("  goals:", correctProfile.goals);

  var userId = "a7b9998f-8f4b-46d4-a5a6-ade296a1fe48";

  var dbProfile = {
    id: userId,
    email: "tenderomaxwell@gmail.com",
    name: correctProfile.name,
    age: correctProfile.age ? Number(correctProfile.age) : null,
    sex: correctProfile.sex,
    height_feet: correctProfile.heightFeet || (correctProfile.height ? Math.floor(Number(correctProfile.height) / 12) : null),
    height_inches: correctProfile.heightInches || (correctProfile.height ? Number(correctProfile.height) % 12 : null),
    weight: correctProfile.weight ? Number(correctProfile.weight) : null,
    goals: correctProfile.goals,
    exercise_types: correctProfile.exercises,
    dietary_preferences: correctProfile.restrictions,
    meal_cadence: correctProfile.mealPattern,
    onboarding_complete: true,
    full_profile: correctProfile,
    updated_at: new Date().toISOString()
  };

  console.log("\nUpdating Supabase with:");
  console.log("  name:", dbProfile.name);
  console.log("  age:", dbProfile.age);
  console.log("  weight:", dbProfile.weight);

  var updateResult = await supabase.from("users_profile").update(dbProfile).eq("id", userId);

  if (updateResult.error) {
    console.error("\nUPDATE FAILED:", updateResult.error.message);
    return;
  }

  console.log("\nUPDATE SUCCESSFUL!");

  var verifyResult = await supabase.from("users_profile").select("*").eq("id", userId).single();

  if (verifyResult.error) {
    console.error("Verify failed:", verifyResult.error.message);
    return;
  }

  var verified = verifyResult.data;
  console.log("\n=== VERIFIED SUPABASE PROFILE ===");
  console.log("  name:", verified.name);
  console.log("  age:", verified.age);
  console.log("  weight:", verified.weight);
  console.log("  goals:", verified.goals);
  console.log("  onboarding_complete:", verified.onboarding_complete);
  console.log("\nPROFILE FIX COMPLETE!");
})();
