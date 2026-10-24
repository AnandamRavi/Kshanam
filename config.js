/* ==========================================================
   SITE CONFIG — this is the only file most people will ever
   need to touch by hand, and even this is just a handful of
   links, pasted in once.

   How to get these URLs:
   1. Open your Google Sheet.
   2. File > Share > Publish to web.
   3. Under "Link", choose the specific tab (e.g. "Guests"),
      set the format to "Comma-separated values (.csv)",
      and click Publish.
   4. Copy the link it gives you and paste it below.
   5. Repeat for every tab.
   6. Tick "Automatically republish when I make changes" if
      offered, so edits show up on the site without redoing
      this step.

   Full walkthrough: see README.md
   ========================================================== */

const CONFIG = {
  GUESTS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1712600504&single=true&output=csv",
  EVENTS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1913252533&single=true&output=csv",
  PARTY_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1044096524&single=true&output=csv",
  FAQ_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1088904958&single=true&output=csv",
  STORY_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1183152801&single=true&output=csv",
  SETTINGS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1017722567&single=true&output=csv",
  INVITATIONS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1158464606&single=true&output=csv",

  // Groups and RSVP Questions tabs.
  GROUPS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=1642067591&single=true&output=csv",
  RSVP_QUESTIONS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=984748066&single=true&output=csv",

  // Travel tab.
  TRAVEL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYno1_k7IISr9-ll810t6YdVxP8YSg94XOaQsqVR2lrktv6_K12ilDuYpaqMF6-c-2pPgCZGRaOtd/pub?gid=188996936&single=true&output=csv",

  // Where RSVP submissions are sent — your Apps Script Web App URL.
  // See README.md, "Setting up RSVP" for how to get this.
  RSVP_ENDPOINT_URL: "https://script.google.com/macros/s/AKfycbzIOVVDPcL1A3KbBvBsh5OEUyVjGeTlan0KrrEAvzCFlvXqbf7ACSoZuebb7RCkEsGx/exec",
};

/* ==========================================================
   Everything else — cover image, countdown date/time, page
   banners, and site text — lives in your Settings tab in
   Google Sheets, not here. See README.md for the full
   walkthrough.
   ========================================================== */
