/* Loads the Settings sheet once per page and caches it, so cover
   image, countdown, and banner images all come from one shared
   lookup instead of being hand-typed into config.js. */

// Instruction text in the sheet (e.g. "<Enter the name of the event>") is
// treated as an empty cell, so leftover instructions never show on the site.
(function () {
  if (typeof Papa === "undefined" || Papa.__placeholderPatched) return;
  const original = Papa.parse;
  const isPlaceholder = (v) =>
    typeof v === "string" && /^<\s*(enter|add|optional)\b[\s\S]*>$/i.test(v.trim());
  Papa.parse = function (input, config) {
    const cfg = Object.assign({}, config);
    const previous = cfg.transform;
    cfg.transform = function (value, field) {
      const v = previous ? previous(value, field) : value;
      return isPlaceholder(v) ? "" : v;
    };
    return original.call(Papa, input, cfg);
  };
  Papa.__placeholderPatched = true;
})();

// Accepts any normal Google Drive share link for an image and returns the
// direct-image form that actually displays on a web page. Other links
// (including ones already in the right format) pass through unchanged.
//   https://drive.google.com/file/d/ID/view?usp=sharing
//   https://drive.google.com/open?id=ID
//   https://drive.google.com/uc?export=view&id=ID
function resolveImageUrl(raw) {
  const url = (raw || "").trim();
  if (!url) return "";
  if (!/drive\.google\.com/.test(url)) return url;
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

let __settingsCache = null;

async function loadSettings() {
  if (__settingsCache) return __settingsCache;

  if (!CONFIG.SETTINGS_CSV_URL || CONFIG.SETTINGS_CSV_URL.startsWith("PASTE_")) {
    __settingsCache = {};
    return __settingsCache;
  }

  try {
    const res = await fetch(CONFIG.SETTINGS_CSV_URL, { cache: "no-store" });
    const text = await res.text();
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

    const map = {};
    data.forEach((row) => {
      if (row.Key) map[row.Key.trim()] = (row.Value || "").trim();
    });

    __settingsCache = map;
  } catch (err) {
    console.error("Could not load Settings sheet:", err);
    __settingsCache = {};
  }

  return __settingsCache;
}

/* Applies site-wide text that appears on more than one page (hero
   heading, browser tab title, footer line), so this only needs to be
   written once here rather than in every page's own script. Elements
   that don't exist on a given page are simply skipped. */
document.addEventListener("DOMContentLoaded", async function () {
  const settings = await loadSettings();

  const eyebrow = document.getElementById("hero-eyebrow");
  if (eyebrow && settings.HeroEyebrow) eyebrow.textContent = settings.HeroEyebrow;

  const title = document.getElementById("hero-title");
  if (title && settings.HeroTitle) title.textContent = settings.HeroTitle;

  const footer = document.getElementById("site-footer");
  if (footer && settings.FooterText) footer.textContent = settings.FooterText;

  const lookupHeading = document.getElementById("lookup-heading");
  if (lookupHeading && settings.LookupHeading) lookupHeading.textContent = settings.LookupHeading;

  const lookupSubtext = document.getElementById("lookup-subtext");
  if (lookupSubtext && settings.LookupSubtext) lookupSubtext.textContent = settings.LookupSubtext;

  const storyTitle = document.getElementById("story-page-title");
  if (storyTitle && settings.StoryPageTitle) storyTitle.textContent = settings.StoryPageTitle;

  const navStory = document.getElementById("nav-story");
  if (navStory && settings.StoryPageTitle) navStory.textContent = settings.StoryPageTitle;

  const partyTitle = document.getElementById("party-page-title");
  if (partyTitle && settings.PartyPageTitle) partyTitle.textContent = settings.PartyPageTitle;

  const navParty = document.getElementById("nav-party");
  if (navParty && settings.PartyPageTitle) navParty.textContent = settings.PartyPageTitle;

  const faqTitle = document.getElementById("faq-page-title");
  if (faqTitle && settings.FaqPageTitle) faqTitle.textContent = settings.FaqPageTitle;

  const navFaq = document.getElementById("nav-faq");
  if (navFaq && settings.FaqPageTitle) navFaq.textContent = settings.FaqPageTitle;

  const rsvpTitle = document.getElementById("rsvp-page-title");
  if (rsvpTitle && settings.RsvpPageTitle) rsvpTitle.textContent = settings.RsvpPageTitle;

  const navRsvp = document.getElementById("nav-rsvp");
  if (navRsvp && settings.RsvpPageTitle) navRsvp.textContent = settings.RsvpPageTitle;

  const travelTitle = document.getElementById("travel-page-title");
  if (travelTitle && settings.TravelPageTitle) travelTitle.textContent = settings.TravelPageTitle;

  const navTravel = document.getElementById("nav-travel");
  if (navTravel && settings.TravelPageTitle) navTravel.textContent = settings.TravelPageTitle;

  // Page on/off switches. Set a Show...Page row in Settings to No (or
  // Hide / False / Off) to take that page out of the site: its menu
  // link disappears everywhere, and anyone opening its address
  // directly is sent to the home page. Blank or Yes leaves it as-is.
  const PAGE_SWITCHES = [
    { key: "ShowStoryPage", file: "our-story", nav: "nav-story" },
    { key: "ShowPartyPage", file: "wedding-party", nav: "nav-party" },
    { key: "ShowTravelPage", file: "travel", nav: "nav-travel" },
    { key: "ShowFaqPage", file: "faq", nav: "nav-faq" },
    { key: "ShowRsvpPage", file: "rsvp", nav: "nav-rsvp" },
  ];
  const isOff = (v) => ["no", "false", "hide", "hidden", "off", "0"].includes((v || "").trim().toLowerCase());
  const currentPage = (window.location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "");

  PAGE_SWITCHES.forEach((p) => {
    if (!isOff(settings[p.key])) return;
    const link = document.getElementById(p.nav);
    if (link) link.style.display = "none";
    if (p.file === "rsvp") {
      const cta = document.getElementById("rsvp-cta");
      if (cta) cta.style.display = "none";
    }
    if (currentPage === p.file) window.location.replace("index.html");
  });

  if (settings.SiteTitle) document.title = settings.SiteTitle;

  const borderImage = resolveImageUrl(settings.PageBorderImage);
  if (borderImage) {
    document.querySelectorAll(".page-border, .hero-border").forEach((el) => {
      el.style.backgroundImage = `url("${borderImage}")`;
      el.classList.add("has-image");
    });
    // On the home page, leave room inside the text column for the pillars.
    const heroColumn = document.querySelector(".hero-split-content");
    if (heroColumn) heroColumn.classList.add("has-borders");
  }

  const venueDetails = document.getElementById("venue-details");
  const venueText = document.getElementById("venue-text");
  const venueMapLink = document.getElementById("venue-map-link");
  if (venueDetails && venueText && settings.VenueDetails) {
    venueText.textContent = settings.VenueDetails;
    venueDetails.style.display = "block";

    const mapUrl = settings.VenueMapLink
      ? settings.VenueMapLink
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.VenueDetails)}`;
    venueMapLink.href = mapUrl;
    venueMapLink.style.display = "inline-block";
  }

  // Reveal the hero text now that it shows the real content, rather
  // than flashing the placeholder text before this fetch resolves.
  const heroContent = document.querySelector(".hero-split-inner");
  if (heroContent) heroContent.classList.add("ready");
});
