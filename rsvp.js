function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function normalize(str) {
  return (str || "").toString().trim().toLowerCase();
}

async function fetchCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load sheet: " + res.status);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  return parsed.data;
}

function splitEventIds(raw) {
  return (raw || "")
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeEventCombo(raw) {
  return splitEventIds(raw)
    .map((s) => s.toLowerCase())
    .sort()
    .join("|");
}

function resolveInvitationUrls(raw) {
  const url = (raw || "").trim();
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    const id = match[1];
    return {
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      openUrl: `https://drive.google.com/file/d/${id}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
    };
  }
  return { embedUrl: url, openUrl: url, downloadUrl: url };
}

function renderInvitation(invitationUrl) {
  const container = document.getElementById("invitation-embed");
  if (!container) return;
  const urls = resolveInvitationUrls(invitationUrl);
  if (!urls) {
    container.style.display = "none";
    return;
  }
  container.innerHTML = `
    <iframe class="invitation-frame" src="${urls.embedUrl}" loading="lazy"></iframe>
    <div class="invitation-actions">
      <a class="invitation-link invitation-download" href="${urls.downloadUrl}" download>Download invitation</a>
      <a class="invitation-link" href="${urls.openUrl}" target="_blank" rel="noopener">Open full invitation</a>
    </div>
  `;
  container.style.display = "block";
}

function formatDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function capitalize(s) {
  s = (s || "").trim();
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "";
}

function generateCode(firstName, lastName, existingCodes) {
  var base = (capitalize(firstName) + capitalize(lastName)).replace(/[^a-zA-Z]/g, "");
  if (!base) base = "Guest";
  var codes = existingCodes || new Set();
  var code = base;
  var n = 2;
  while (codes.has(code.toLowerCase())) {
    code = base + n;
    n++;
  }
  return code;
}

let CURRENT_GUEST = null;  // { code, name, isNew, groupName }
let CURRENT_EVENTS = [];
let ALL_EVENTS = [];
let GROUPS_DATA = [];
let RSVP_Q = {}; // RSVP Questions lookup

async function loadRsvpQuestions() {
  if (!CONFIG.RSVP_QUESTIONS_CSV_URL || CONFIG.RSVP_QUESTIONS_CSV_URL.startsWith("PASTE_")) return {};
  try {
    const data = await fetchCsv(CONFIG.RSVP_QUESTIONS_CSV_URL);
    const map = {};
    data.forEach((row) => { if (row.Key) map[row.Key.trim()] = (row.Value || "").trim(); });
    return map;
  } catch (err) {
    console.error("Could not load RSVP Questions sheet:", err);
    return {};
  }
}

function applyRsvpQuestionText() {
  const setText = (id, key, fallback) => {
    const el = document.getElementById(id);
    if (el) el.textContent = RSVP_Q[key] || fallback;
  };
  setText("group-name-label", "GroupNameLabel", "Which group are you part of?");
  setText("first-name-label", "FirstNameLabel", "First name");
  setText("last-name-label", "LastNameLabel", "Last name");
  setText("code-label", "CodeLabel", "Access code");
  setText("attending-gate-label", "AttendingGateQuestion", "Do you plan to attend any of these events?");
  setText("decline-message", "DeclineMessage", "We are sorry that you can't make it. If anything changes, you can always change your response. Just log in again and update your response.");
  setText("contact-pref-label", "ContactPreferenceQuestion", "What's the best way to reach you?");
  setText("whatsapp-label", "WhatsAppLabel", "WhatsApp number");
  setText("email-label", "EmailLabel", "Email address");
  setText("out-of-town-label", "OutOfTownQuestion", "Are you coming from out of town?");
  setText("accommodation-label", "AccommodationQuestion", "Do you need accommodation?");
}

async function populateGroupDropdown() {
  const select = document.getElementById("group-select");
  if (!CONFIG.GROUPS_CSV_URL || CONFIG.GROUPS_CSV_URL.startsWith("PASTE_")) return;
  try {
    GROUPS_DATA = await fetchCsv(CONFIG.GROUPS_CSV_URL);
    const options = GROUPS_DATA
      .filter((g) => g.GroupName)
      .map((g) => `<option value="${g.GroupName}" data-has-code="${window.groupHasCode(g)}">${g.GroupName}</option>`)
      .join("");
    select.innerHTML = `<option value="" disabled selected>Choose a group</option>${options}`;
  } catch (err) {
    console.error("Could not load Groups sheet:", err);
  }
}

function renderEventFields(events) {
  const container = document.getElementById("rsvp-events");
  container.innerHTML = events
    .map((ev) => {
      const dateLine = [formatDate(ev.Date), ev.Time].filter(Boolean).join(" · ");
      return `
        <div class="rsvp-event">
          ${dateLine ? `<p class="event-date">${dateLine}</p>` : ""}
          <h3>${ev.Name || "Untitled event"}</h3>
          ${ev.Location ? `<p class="location">${ev.Location}</p>` : ""}
          <div class="rsvp-field">
            <label>Will you attend?</label>
            <div class="rsvp-radios">
              <label><input type="radio" name="attending-${ev.ID}" value="Yes" required> Yes</label>
              <label><input type="radio" name="attending-${ev.ID}" value="No" required> No</label>
            </div>
          </div>
          <div class="rsvp-field rsvp-count-wrap" id="count-wrap-${ev.ID}" style="display:none;">
            <label for="count-${ev.ID}">Number attending (including you)</label>
            <input type="number" id="count-${ev.ID}" name="count-${ev.ID}" min="1" value="1">
          </div>
        </div>
      `;
    })
    .join("");

  events.forEach((ev) => {
    const radios = document.querySelectorAll(`input[name="attending-${ev.ID}"]`);
    const countWrap = document.getElementById(`count-wrap-${ev.ID}`);
    const countInput = document.getElementById(`count-${ev.ID}`);
    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.checked && radio.value === "Yes") {
          countWrap.style.display = "block";
          if (!countInput.value || Number(countInput.value) < 1) countInput.value = 1;
        } else if (radio.checked && radio.value === "No") {
          countWrap.style.display = "none";
          countInput.value = 0;
        }
      });
    });
  });
}

function wireAttendingGate() {
  const radios = document.querySelectorAll('input[name="attending-any"]');
  const yesSection = document.getElementById("attending-yes-section");
  const declineMsg = document.getElementById("decline-message");
  const submitBtn = document.getElementById("rsvp-submit");

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      submitBtn.style.display = "inline-block";
      if (radio.checked && radio.value === "Yes") {
        yesSection.style.display = "block";
        declineMsg.style.display = "none";
      } else if (radio.checked && radio.value === "No") {
        yesSection.style.display = "none";
        declineMsg.style.display = "block";
      }
    });
  });

  document.querySelectorAll('input[name="contact-method"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const checked = (document.querySelector('input[name="contact-method"]:checked') || {}).value;
      document.getElementById("whatsapp-wrap").style.display = checked === "WhatsApp" ? "block" : "none";
      document.getElementById("email-wrap").style.display = checked === "Email" ? "block" : "none";
    });
  });

  document.querySelectorAll('input[name="out-of-town"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      document.getElementById("accommodation-wrap").style.display =
        (document.querySelector('input[name="out-of-town"]:checked') || {}).value === "Yes" ? "block" : "none";
    });
  });
}

async function identifyComplete() {
  document.getElementById("identify-box").style.display = "none";
  document.getElementById("empty-state").style.display = CURRENT_EVENTS.length ? "none" : "block";

  const settings = await loadSettings();
  const greetingEl = document.getElementById("greeting");
  const template = settings.GreetingTemplate || "Welcome, {name}.";
  document.getElementById("greeting-text").textContent = template.replace("{name}", CURRENT_GUEST.name || "there");
  greetingEl.style.display = "block";

  let invitations = [];
  try {
    if (CONFIG.INVITATIONS_CSV_URL && !CONFIG.INVITATIONS_CSV_URL.startsWith("PASTE_")) {
      invitations = await fetchCsv(CONFIG.INVITATIONS_CSV_URL);
    }
  } catch (err) { console.error(err); }
  const comboKey = normalizeEventCombo(CURRENT_EVENTS.map((e) => e.ID).join(";"));
  const match = invitations.find((inv) => normalizeEventCombo(inv.Events) === comboKey);
  renderInvitation(match ? match.InvitationURL : "");

  if (CURRENT_EVENTS.length) {
    renderEventFields(CURRENT_EVENTS);
    document.getElementById("rsvp-form").style.display = "block";
  }
}

async function showGuest(code) {
  const errorEl = document.getElementById("lookup-error");
  errorEl.style.display = "none";
  errorEl.textContent = "";

  let guests;
  try {
    guests = await fetchCsv(CONFIG.GUESTS_CSV_URL);
    ALL_EVENTS = await fetchCsv(CONFIG.EVENTS_CSV_URL);
  } catch (err) {
    errorEl.textContent = "We're having trouble loading things right now — please try again shortly.";
    errorEl.style.display = "block";
    console.error(err);
    return;
  }

  const guest = guests.find((g) => normalize(g.Code) === normalize(code));
  if (!guest) {
    errorEl.textContent = "We couldn't find that code — please double check it, or check with your host if you registered as part of a group recently.";
    errorEl.style.display = "block";
    return;
  }

  const invitedIds = splitEventIds(guest.Events).map(normalize);
  CURRENT_EVENTS = ALL_EVENTS
    .filter((ev) => invitedIds.includes(normalize(ev.ID)))
    .sort((a, b) => new Date(a.Date) - new Date(b.Date));

  CURRENT_GUEST = { code: guest.Code, name: guest.Name, isNew: false, groupName: "" };

  const url = new URL(window.location);
  url.searchParams.set("g", code);
  window.history.replaceState({}, "", url);

  identifyComplete();
}

async function submitRsvp(e) {
  e.preventDefault();

  if (!CONFIG.RSVP_ENDPOINT_URL || CONFIG.RSVP_ENDPOINT_URL.startsWith("PASTE_")) {
    document.getElementById("rsvp-status").textContent = "RSVP submissions aren't set up yet — see README.md.";
    return;
  }

  const submitBtn = document.getElementById("rsvp-submit");
  const statusEl = document.getElementById("rsvp-status");
  statusEl.textContent = "";

  const attendingAny = (document.querySelector('input[name="attending-any"]:checked') || {}).value || "No";

  let responses = [];
  let contactMethod = "", contactValue = "", outOfTown = "", needsAccommodation = "", notes = "";

  if (attendingAny === "Yes") {
    responses = CURRENT_EVENTS.map((ev) => {
      const attending = document.querySelector(`input[name="attending-${ev.ID}"]:checked`);
      const count = document.getElementById(`count-${ev.ID}`);
      return {
        eventId: ev.ID,
        eventName: ev.Name || "",
        attending: attending ? attending.value : "",
        guestCount: count ? count.value : "",
      };
    });

    contactMethod = (document.querySelector('input[name="contact-method"]:checked') || {}).value || "";
    contactValue = contactMethod === "WhatsApp"
      ? window.SiteCountries.build(
          document.getElementById("whatsapp-input").value,
          document.getElementById("whatsapp-country").value
        )
      : contactMethod === "Email"
        ? document.getElementById("email-input").value.trim()
        : "";

    outOfTown = (document.querySelector('input[name="out-of-town"]:checked') || {}).value || "";
    needsAccommodation = outOfTown === "Yes"
      ? (document.querySelector('input[name="needs-accommodation"]:checked') || {}).value || ""
      : "";

    notes = document.getElementById("rsvp-notes").value.trim();

    // Manual validation for fields that live inside conditionally
    // hidden sections — native `required` doesn't reliably skip these
    // across browsers once they've been shown and hidden again.
    const missing = [];
    if (responses.some((r) => !r.attending)) missing.push("whether you're attending each event");
    if (!contactMethod) missing.push("your preferred contact method");
    if (contactMethod && !contactValue) missing.push(contactMethod === "WhatsApp" ? "a valid WhatsApp number (check the country and the number)" : "your email address");
    if (!outOfTown) missing.push("whether you're coming from out of town");
    if (outOfTown === "Yes" && !needsAccommodation) missing.push("whether you need accommodation");

    if (missing.length) {
      statusEl.textContent = "Please answer: " + missing.join(", ") + ".";
      return;
    }
  } else {
    responses = CURRENT_EVENTS.map((ev) => ({
      eventId: ev.ID, eventName: ev.Name || "", attending: "No", guestCount: "0",
    }));
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  const payload = {
    mode: CURRENT_GUEST.isNew ? "group" : "existing",
    code: CURRENT_GUEST.code,
    name: CURRENT_GUEST.name,
    groupName: CURRENT_GUEST.groupName || "",
    attendingAny,
    responses,
    contactMethod,
    contactValue,
    outOfTown,
    needsAccommodation,
    notes,
  };

  try {
    await fetch(CONFIG.RSVP_ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    submitBtn.textContent = "Submitted";
    const revisit = CURRENT_GUEST.isNew
      ? "Once the hosts confirm you, we'll send you a personal link so you can update it any time."
      : "You can revisit this link any time to update it.";
    if (attendingAny === "No") {
      statusEl.innerHTML = `<p>Your response has been recorded. ${revisit}</p>`;
    } else {
      statusEl.innerHTML = `
        <p>Thank you — your RSVP has been recorded. ${revisit}</p>
        <ul class="rsvp-summary">
          ${responses.map((r) => {
            const line = r.attending === "Yes"
              ? `${r.eventName}: <strong>Yes</strong> — ${r.guestCount || 1} guest${r.guestCount == 1 ? "" : "s"}`
              : `${r.eventName}: <strong>No</strong>`;
            return `<li>${line}</li>`;
          }).join("")}
        </ul>
      `;
    }
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit RSVP";
    statusEl.textContent = "Something went wrong submitting your RSVP — please try again.";
    console.error(err);
  }
}

function init() {
  document.getElementById("show-group-form").addEventListener("click", () => {
    document.getElementById("lookup-form").style.display = "none";
    document.getElementById("show-group-form").style.display = "none";
    document.getElementById("group-form").style.display = "block";
  });

  document.getElementById("show-code-form").addEventListener("click", () => {
    document.getElementById("group-form").style.display = "none";
    document.getElementById("lookup-form").style.display = "block";
    document.getElementById("show-group-form").style.display = "block";
  });

  document.getElementById("lookup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("code-input").value.trim();
    if (code) showGuest(code);
  });

  document.getElementById("rsvp-form").addEventListener("submit", submitRsvp);

  wireAttendingGate();
  window.SiteCountries.populate(document.getElementById("whatsapp-country"));
  populateGroupDropdown();

  loadRsvpQuestions().then((q) => {
    RSVP_Q = q;
    applyRsvpQuestionText();
  });

  // Arriving already identified from the home page (existing guest)?
  const codeFromUrl = getParam("g");
  if (codeFromUrl) {
    showGuest(codeFromUrl);
    return;
  }

  // Arriving from the home page after entering a valid group code?
  if (getParam("mode") === "group") {
    resumeGroupMemberFromParams();
  }
}

// Shows the RSVP form for a guest who joined with a group code but hasn't
// been approved yet (so they aren't in the Guests tab).
async function loadGroupGuestEvents(groupName) {
  ALL_EVENTS = await fetchCsv(CONFIG.EVENTS_CSV_URL);
  if (!GROUPS_DATA.length) {
    GROUPS_DATA = CONFIG.GROUPS_CSV_URL && !CONFIG.GROUPS_CSV_URL.startsWith("PASTE_")
      ? await fetchCsv(CONFIG.GROUPS_CSV_URL)
      : [];
  }
  const group = GROUPS_DATA.find((g) => normalize(g.GroupName) === normalize(groupName));
  const invitedIds = splitEventIds(group ? group.Events : "").map(normalize);
  CURRENT_EVENTS = ALL_EVENTS
    .filter((ev) => invitedIds.includes(normalize(ev.ID)))
    .sort((a, b) => new Date(a.Date) - new Date(b.Date));
}

async function resumeGroupMemberFromParams() {
  const groupName = getParam("group") || "";
  const firstName = getParam("first") || "";
  const lastName = getParam("last") || "";
  const code = getParam("code") || "";
  try {
    await loadGroupGuestEvents(groupName);
  } catch (err) {
    console.error(err);
    return;
  }
  CURRENT_GUEST = { code, name: `${firstName} ${lastName}`.trim(), isNew: true, groupName, firstName, lastName };
  identifyComplete();
}

// Called by register.js once a guest has entered a valid group code.
window.onGroupAccessGranted = async function (info) {
  await loadGroupGuestEvents(info.groupName);
  CURRENT_GUEST = {
    code: info.code,
    name: `${info.firstName} ${info.lastName}`,
    isNew: true,
    groupName: info.groupName,
    firstName: info.firstName,
    lastName: info.lastName,
  };
  identifyComplete();
};

document.addEventListener("DOMContentLoaded", init);
