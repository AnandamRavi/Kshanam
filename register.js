/* Group sign-up: a guest who clicked a link from a group chat enters their
   group, name, and how to reach them. That goes straight to the Pending
   Guests tab. They see a thank-you and nothing else (no invitation, no
   events) until the host approves them, at which point they're notified
   and get their access code. Used by both the home page and RSVP page. */

(function () {
  const $ = (id) => document.getElementById(id);

  // Country calling codes offered in the WhatsApp dropdown.
  const COUNTRIES = [
    ["AR","Argentina","54"],["AU","Australia","61"],["AT","Austria","43"],["BH","Bahrain","973"],
    ["BD","Bangladesh","880"],["BE","Belgium","32"],["BR","Brazil","55"],["CA","Canada","1"],
    ["CN","China","86"],["CO","Colombia","57"],["DK","Denmark","45"],["EG","Egypt","20"],
    ["FI","Finland","358"],["FR","France","33"],["DE","Germany","49"],["GH","Ghana","233"],
    ["GR","Greece","30"],["HK","Hong Kong","852"],["IN","India","91"],["ID","Indonesia","62"],
    ["IE","Ireland","353"],["IL","Israel","972"],["IT","Italy","39"],["JP","Japan","81"],
    ["JO","Jordan","962"],["KE","Kenya","254"],["KW","Kuwait","965"],["LK","Sri Lanka","94"],
    ["MY","Malaysia","60"],["MU","Mauritius","230"],["MX","Mexico","52"],["NP","Nepal","977"],
    ["NL","Netherlands","31"],["NZ","New Zealand","64"],["NG","Nigeria","234"],["NO","Norway","47"],
    ["OM","Oman","968"],["PK","Pakistan","92"],["PH","Philippines","63"],["PL","Poland","48"],
    ["PT","Portugal","351"],["QA","Qatar","974"],["SA","Saudi Arabia","966"],["SG","Singapore","65"],
    ["ZA","South Africa","27"],["KR","South Korea","82"],["ES","Spain","34"],["SE","Sweden","46"],
    ["CH","Switzerland","41"],["TH","Thailand","66"],["TR","Türkiye","90"],["AE","United Arab Emirates","971"],
    ["GB","United Kingdom","44"],["US","United States","1"],["VN","Vietnam","84"],
  ];

  function populateCountries(sel) {
    sel = sel || $("reg-country");
    if (!sel || sel.options.length) return;
    sel.innerHTML = COUNTRIES.map(([iso, name, dial]) =>
      `<option value="${dial}" data-iso="${iso}">${name} (+${dial})</option>`).join("");
    // Pre-select the guest's own country, guessed from their browser language.
    const region = ((navigator.language || "").split("-")[1] || "").toUpperCase();
    const match = Array.from(sel.options).find((o) => o.dataset.iso === region);
    if (match) sel.value = match.value;
  }

  // Turns what the guest typed + the chosen country into "+<code><number>".
  // Returns "" if it doesn't look like a real number. A number typed with
  // its own "+" or "00" prefix is taken as already international.
  function buildWhatsAppNumber(typed, dial) {
    const raw = (typed || "").trim();
    let digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+")) {
      // already international
    } else if (digits.startsWith("00")) {
      digits = digits.slice(2);
    } else {
      digits = dial + digits.replace(/^0+/, ""); // drop the local leading zero
    }
    return digits.length >= 8 && digits.length <= 15 ? "+" + digits : "";
  }

  // Does this group offer a code? Read from the Groups data the page already
  // loaded: either the Code column itself (if Groups is published directly) or a
  // HasCode column (the Groups Public setup, which keeps the codes themselves
  // private). With neither column, return "unknown" and show the box as before.
  window.groupHasCode = function (g) {
    const col = "Code" in g ? g.Code : "HasCode" in g ? g.HasCode : null;
    if (col === null) return "unknown";
    return String(col || "").trim() ? "yes" : "no";
  };

  // Only show the group code box for groups that actually have a code.
  function updateGroupCodeBox() {
    const sel = $("group-select");
    const wrap = $("reg-group-code-wrap");
    if (!sel || !wrap) return;
    const opt = sel.selectedOptions && sel.selectedOptions[0];
    const flag = opt ? opt.getAttribute("data-has-code") : "";
    const show = opt && opt.value && flag !== "no";
    wrap.style.display = show ? "" : "none";
    if (!show && $("reg-group-code")) $("reg-group-code").value = "";
  }

  // Shared with rsvp.js, which has its own WhatsApp field with the same dropdown.
  window.SiteCountries = { populate: populateCountries, build: buildWhatsAppNumber };

  function showError(msg) {
    const el = $("lookup-error");
    el.textContent = msg;
    el.style.display = "block";
  }

  async function submitRegistration(e) {
    e.preventDefault();
    const err = $("lookup-error");
    err.style.display = "none";
    err.textContent = "";

    const groupName = $("group-select").value;
    const firstName = $("first-name-input").value.trim();
    const lastName = $("last-name-input").value.trim();
    const groupCode = ($("reg-group-code") || { value: "" }).value.trim();
    const email = $("reg-email").value.trim();
    const whatsappTyped = $("reg-contact-value").value.trim();

    if (!groupName || !firstName || !lastName) {
      return showError("Please fill in your group, first name, and last name.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError("Please enter a valid email address — that's how we'll send you your personal link.");
    }
    // WhatsApp is optional, but if they typed a number it has to look right.
    let whatsapp = "";
    if (whatsappTyped) {
      whatsapp = buildWhatsAppNumber(whatsappTyped, $("reg-country").value);
      if (!whatsapp) {
        return showError("That WhatsApp number doesn't look right — please check the country and the number, or leave it blank.");
      }
    }
    if (!CONFIG.RSVP_ENDPOINT_URL || CONFIG.RSVP_ENDPOINT_URL.startsWith("PASTE_")) {
      return showError("Sign-ups aren't set up yet — please check with your host.");
    }

    const btn = $("group-form").querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      const res = await fetch(CONFIG.RSVP_ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          mode: "register",
          groupName, firstName, lastName, groupCode,
          name: `${firstName} ${lastName}`,
          email,
          whatsapp,
        }),
      });
      const result = await res.json();

      if (result && result.status === "badcode") {
        btn.disabled = false;
        btn.textContent = label;
        return showError("That group code doesn't look right. Please check it, or clear the box to ask the hosts for approval instead.");
      }
      if (result && result.status === "toomany") {
        btn.disabled = false;
        btn.textContent = label;
        return showError("Too many attempts — please wait a few minutes and try again.");
      }
      if (!result || result.status !== "ok") {
        throw new Error((result && result.message) || "Registration was not saved.");
      }

      // Correct group code: the guest can see the invitation and RSVP right away.
      if (result.access && typeof window.onGroupAccessGranted === "function") {
        await window.onGroupAccessGranted({ code: result.code, groupName, firstName, lastName });
        const box0 = $("lookup") || $("identify-box");
        if (box0) box0.style.display = "none";
        return;
      }
    } catch (ex) {
      console.error(ex);
      btn.disabled = false;
      btn.textContent = label;
      return showError("Something went wrong sending your request — please try again in a moment.");
    }

    // Success: hide the sign-up box and show only the thank-you.
    const box = $("lookup") || $("identify-box");
    if (box) box.style.display = "none";
    $("pending-message").textContent =
      `Thank you, ${firstName}! Your request has been sent to the hosts. ` +
      `Once they approve it, we'll email you at ${email} with your personal link.`;
    $("pending-notice").style.display = "block";
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = $("group-form");
    if (!form) return;
    populateCountries();
    $("group-select").addEventListener("change", updateGroupCodeBox);
    form.addEventListener("submit", submitRegistration);
  });
})();
