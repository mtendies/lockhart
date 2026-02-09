// Run this in browser console to push fixed data to Supabase

var authData = JSON.parse(localStorage.getItem("sb-wblumhrmsihjaruztlxf-auth-token"));
var userId = authData.user.id;
var localData = JSON.parse(localStorage.getItem("profile_main:health-advisor-nutrition-calibration"));

console.log("User ID:", userId);
console.log("completedAt:", localData.completedAt);

fetch("https://wblumhrmsihjaruztlxf.supabase.co/rest/v1/users_profile?id=eq." + userId, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "apikey": "sb_publishable_OANejQqwHtL4mVZOUC96Lg_6GJKNTnY",
    "Authorization": "Bearer " + authData.access_token,
    "Prefer": "return=minimal"
  },
  body: JSON.stringify({ nutrition_data: localData })
}).then(function(r) {
  console.log("Status:", r.status);
  if (r.ok) {
    console.log("SUCCESS! Now refresh the page.");
  } else {
    r.text().then(function(t) { console.log("Error:", t); });
  }
});
