/* ==========================================================
   invite.js — builds each guest's invitation live from the sheet.

   Reads:  Events tab   (name, date, time, attire, location ...)
           Settings tab (couple names, venue, fonts, sizes, colours ...)
           Wedding Party tab (parents' names, couple's full names)
   Draws:  cover, picture, family page, one page per two events,
           venue, back cover — as real HTML text over the artwork
           in the /invite folder.

   Called from script.js:
     renderGeneratedInvite({ container, events, settings })

   Every text style can be changed from the Settings tab with:
     Invite<Element>_Font | _Size | _Color | _Weight | _Style
   (full list in INVITE-README.md and Settings_invite_rows.csv)
   ========================================================== */
(function () {
  "use strict";

  // Defaults copied from the original PDF. f = font role, s = size in points
  // on a card that is 590 pt wide (sizes scale with the card), c = colour,
  // i = italic.
  var DEF = {
    CoverIntro:    { f: "body",    s: 18.8, c: "#f6cf7a", i: 1 },
    CoverNames:    { f: "display", s: 88.5, c: "#fbe9cf" },
    CoverAmp:      { f: "display", s: 52.5, c: "#e9a820" },
    CoverDate:     { f: "body",    s: 13.5, c: "#f6cf7a" },
    CoverVenue:    { f: "body",    s: 11.2, c: "#f6cf7a" },
    FamilyParents: { f: "display", s: 18,   c: "#7e2a2e" },
    FamilyAnd:     { f: "body",    s: 15,   c: "#8a6a60", i: 1 },
    FamilyRequest: { f: "body",    s: 15.8, c: "#6b2f2a", i: 1 },
    FamilyCouple:  { f: "display", s: 33.8, c: "#7e2a2e" },
    FamilyAmp:     { f: "display", s: 30,   c: "#e9a820" },
    FamilyJoy:     { f: "body",    s: 14.2, c: "#8a6a60", i: 1 },
    FamilyBlessing:{ f: "body",    s: 15,   c: "#e8741e", i: 1 },
    SoloDate:      { f: "display", s: 23.2, c: "#7e2a2e" },
    SoloTime:      { f: "body",    s: 16.5, c: "#8a6a60" },
    SoloWhere:     { f: "body",    s: 16.5, c: "#6b2f2a" },
    SoloAttire:    { f: "body",    s: 14.2, c: "#8a6a60", i: 1 },
    FamilyGrandLabel: { f: "body", s: 12,   c: "#8a6a60" },
    FamilyGrandNames: { f: "body", s: 14,   c: "#8a6a60" },
    FamilyGrandAnd:   { f: "body", s: 12,   c: "#8a6a60" },
    FamilyWhen:    { f: "body",    s: 18,   c: "#7e2a2e" },
    FamilyWhere:   { f: "body",    s: 15.8, c: "#6b2f2a", i: 1 },
    EventLabel:    { f: "body",    s: 12,   c: "#e8741e" },
    EventTitle:    { f: "display", s: 30.8, c: "#7e2a2e" },
    EventDesc:     { f: "body",    s: 14.6, c: "#7e2a2e" },
    EventDate:     { f: "body",    s: 16.5, c: "#6b2f2a" },
    EventTime:     { f: "body",    s: 14.2, c: "#8a6a60" },
    EventAttire:   { f: "body",    s: 13.5, c: "#8a6a60" },
    VenueLabel:    { f: "body",    s: 12,   c: "#e8741e" },
    VenueName:     { f: "display", s: 25.5, c: "#7e2a2e" },
    VenueTagline:  { f: "body",    s: 24,   c: "#7e2a2e", i: 1 },
    BackCaption:   { f: "body",    s: 28.5, c: "#fbe9cf", i: 1 }
  };
  var TEXT_DEFAULTS = {
    InviteFontDisplay: "DM Serif Display",
    InviteFontBody: "Cormorant Garamond",
    InviteIntroText: "You are cordially invited to the wedding of",
    InviteRequestText: "request the pleasure of your company at {event} of their children",
    InviteMainEvent: "WEDDING",
    InviteJoyText: "With their joy shared by",
    InviteAndText: "and",
    InviteGroomGrandLabel: "Grandson of",
    InviteBrideGrandLabel: "Granddaughter of",
    InviteParentOrder: "father",
    InviteWhenPrefix: "On",
    InviteWherePrefix: "At",
    InviteVenueLabel: "The venue",
    InviteAttireLabel: "Attire:",
    InvitePlaceLabel: "Venue:",
    InviteTimeSuffix: "onwards",
    InviteLocale: "en-US"
  };

  /* ---------- small helpers ---------- */
  function typo(s) {
    return String(s == null ? "" : s).replace(/"([^"]*)"/g, "\u201C$1\u201D").replace(/'/g, "\u2019");
  }
  function esc(s) {
    return typo(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function isOff(v) {
    return ["no", "false", "hide", "hidden", "off", "0", "none"].indexOf(String(v || "").trim().toLowerCase()) > -1;
  }
  function img(url) {
    return typeof resolveImageUrl === "function" ? resolveImageUrl(url) : String(url || "").trim();
  }
  function list(raw) {
    return String(raw || "").split(/;/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function plain(html) {
    var s = String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n");
    var t = new DOMParser().parseFromString(s, "text/html").body.textContent || "";
    return t.trim();
  }
  function firstPara(text) {
    var p = (text.split(/\n/)[0] || "").trim();
    return p.length > 190 ? p.slice(0, 187).replace(/\s+\S*$/, "") + "\u2026" : p;
  }

  /* ---------- dates & times ---------- */
  function parseDate(raw) {
    raw = String(raw || "").trim();
    if (!raw) return null;
    var m;
    if (/^\d{5}(\.\d+)?$/.test(raw)) { // spreadsheet serial number
      var u = new Date(Math.round((parseFloat(raw) - 25569) * 864e5));
      return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
    }
    if ((m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], m[2] - 1, +m[3]);
    if ((m = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) {
      var a = +m[1], b = +m[2];
      return a > 12 ? new Date(+m[3], b - 1, a) : new Date(+m[3], a - 1, b);
    }
    var d = new Date(raw);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function longDate(d, raw, loc) {
    if (!d) return esc(raw || "");
    return esc(d.toLocaleDateString(loc, { weekday: "long" })) + ", " + esc(d.toLocaleDateString(loc, { month: "long" })) + " " +
      d.getDate() + "<sup>" + ordinal(d.getDate()) + "</sup>, " + d.getFullYear();
  }
  function ordinal(n) {
    var v = n % 100;
    if (v >= 11 && v <= 13) return "th";
    return { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  }
  function fmtTime(raw, suffix) {
    raw = String(raw || "").trim();
    if (!raw) return "";
    var m, h, mi;
    if ((m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?m\.?$/i))) {
      h = (+m[1]) % 12 + (/p/i.test(m[3]) ? 12 : 0); mi = +m[2];
    } else if ((m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/))) {
      h = +m[1]; mi = +m[2];
    } else if (/^0?\.\d+$/.test(raw)) {
      var t = Math.round(parseFloat(raw) * 1440); h = Math.floor(t / 60); mi = t % 60;
    } else return raw; // already free text, e.g. "7 PM to 10 PM"
    return (h % 12 || 12) + ":" + String(mi).padStart(2, "0") + " " + (h >= 12 ? "PM" : "AM") +
      (suffix ? " " + suffix : "");
  }

  /* ---------- people (Wedding Party tab + Settings overrides) ---------- */
  var partyCache = null;
  async function loadParty() {
    if (partyCache) return partyCache;
    partyCache = [];
    try {
      if (typeof CONFIG !== "undefined" && CONFIG.PARTY_CSV_URL && !CONFIG.PARTY_CSV_URL.startsWith("PASTE_")) {
        var res = await fetch(CONFIG.PARTY_CSV_URL, { cache: "no-store" });
        partyCache = Papa.parse(await res.text(), { header: true, skipEmptyLines: true }).data;
      }
    } catch (e) { console.error("Invite: could not load Wedding Party", e); }
    return partyCache;
  }
  function people(party, S) {
    var rows = (party || []).filter(function (p) { return p.Name && String(p.Name).trim(); });
    var role = function (p) { return String(p.Role || "").toLowerCase().trim(); };
    var parentWord = /(father|mother|parent|dad|mum|mom)/;
    var isGroom = function (p) { return /^(bride\s*)?groom$/.test(role(p)); };
    var rank = function (p) { return /(father|dad)/.test(role(p)) ? 0 : /(mother|mum|mom)/.test(role(p)) ? 1 : 2; };
    var keepOrder = /sheet|row|tab|as.?is/i.test(String(S.InviteParentOrder || ""));
    var byRank = function (a, b) { return keepOrder ? 0 : rank(a) - rank(b); };
    var isGrand = function (p) { return /grand|\b(nana|nani|nanu|dada|dadi)(ji)?\b/.test(role(p)); };
    var names = function (arr) { return arr.map(function (p) { return String(p.Name).trim(); }); };

    var groom = rows.filter(isGroom)[0];
    var bride = rows.filter(function (p) { return /^bride$/.test(role(p)); })[0];
    var gp = rows.filter(function (p) { return /groom/.test(role(p)) && parentWord.test(role(p)) && !isGroom(p) && !isGrand(p); }).sort(byRank);
    var bp = rows.filter(function (p) { return /\bbride\b/.test(role(p)) && !/groom/.test(role(p)) && parentWord.test(role(p)) && !isGrand(p); }).sort(byRank);
    // Grandparents: grouped into pairs (paternal side, maternal side, anyone unlabelled)
    var groups = function (arr) {
      var b = { p: [], m: [], o: [] };
      arr.forEach(function (p) {
        var r = role(p);
        (/paternal|(father|dad)'?s (side|parents)/.test(r) ? b.p : /maternal|(mother|mum|mom)'?s (side|parents)/.test(r) ? b.m : b.o).push(p);
      });
      return [b.p, b.m, b.o].filter(function (g) { return g.length; }).map(function (g) { return names(g.sort(byRank)); });
    };
    var gg = rows.filter(function (p) { return /groom/.test(role(p)) && isGrand(p) && !isGroom(p); });
    var bg = rows.filter(function (p) { return /\bbride\b/.test(role(p)) && !/groom/.test(role(p)) && isGrand(p); });
    var parseGroups = function (raw) { return String(raw).split("|").map(list).filter(function (g) { return g.length; }); };
    var joy = rows.filter(function (p) { return /(sister|brother|sibling)/.test(role(p)) && /(bride|groom)/.test(role(p)); });

    var first = function (n) { return String(n || "").trim().split(/\s+/)[0] || ""; };
    var full1 = S.InviteFullName1 || (groom && groom.Name) || "";
    var full2 = S.InviteFullName2 || (bride && bride.Name) || "";
    return {
      name1: S.InviteName1 || first(full1),
      name2: S.InviteName2 || first(full2),
      full1: full1,
      full2: full2,
      side1: S.InviteGroomParents ? list(S.InviteGroomParents) : names(gp),
      side2: S.InviteBrideParents ? list(S.InviteBrideParents) : names(bp),
      grand1: S.InviteGroomGrandparents ? parseGroups(S.InviteGroomGrandparents) : groups(gg),
      grand2: S.InviteBrideGrandparents ? parseGroups(S.InviteBrideGrandparents) : groups(bg),
      joy: S.InviteJoyBy ? list(S.InviteJoyBy) : names(joy)
    };
  }

  /* ---------- fonts ---------- */
  var fontsAsked = {};
  function loadFonts(names) {
    var want = names.filter(function (n) { return n && !fontsAsked[n]; });
    if (!want.length) return;
    want.forEach(function (n) { fontsAsked[n] = 1; });
    // one request per font: if a name is misspelled, only that font fails to load
    want.forEach(function (n) {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css?family=" + n.replace(/ /g, "+") + ":400,400i,500,600,600i&display=swap";
      document.head.appendChild(l);
    });
  }
  function cleanFont(n) { return String(n || "").replace(/[^\w \-]/g, "").trim(); }

  /* ---------- template sets (templates/<id>/template.json) ---------- */
  var tplCache = {};
  function tplId(v) { v = String(v || "").trim().toLowerCase(); return /^[a-z0-9][\w-]*$/.test(v) ? v : "marigold"; }
  async function loadTemplate(id) {
    id = tplId(id);
    if (tplCache[id]) return tplCache[id];
    var T = null;
    try {
      var res = await fetch("templates/" + id + "/template.json", { cache: "no-cache" });
      if (res.ok) T = await res.json();
    } catch (e) { /* fall through */ }
    if (!T) {
      if (id !== "marigold") return loadTemplate("marigold");
      T = {};
    }
    T._id = id; T._base = "templates/" + id + "/";
    tplCache[id] = T;
    return T;
  }
  // template.json -> the same Invite... keys the Settings tab uses
  function templateSettings(T) {
    var o = {};
    if (!T) return o;
    var at = function (v) { v = String(v || ""); return !v ? "" : (/^(https?:)?\/\//.test(v) || v.charAt(0) === "/") ? v : (T._base || "") + v; };
    var im = T.images || {}, f = T.fonts || {}, c = T.colors || {}, el = T.elements || {};
    if (im.cover) o.InviteCoverBg = at(im.cover);
    if (im.scene) o.InviteSceneImage = at(im.scene);
    if (im.back) o.InviteBackBg = at(im.back);
    if (im.ornament) o.InviteOrnament = at(im.ornament);
    if (f.display) o.InviteFontDisplay = f.display;
    if (f.body) o.InviteFontBody = f.body;
    if (T.scale) o.InviteSizeScale = String(T.scale);
    var cm = { cardBg: "InviteCardBg", cardBorder: "InviteCardBorder", rule: "InviteRuleColor", coverBg: "InviteCoverColor", sceneBg: "InviteSceneColor", backBg: "InviteBackColor" };
    Object.keys(cm).forEach(function (k) { if (c[k]) o[cm[k]] = c[k]; });
    Object.keys(el).forEach(function (k) {
      ["font", "size", "color", "style", "weight"].forEach(function (p) {
        if (el[k][p] !== undefined && el[k][p] !== "") o["Invite" + k + "_" + p.charAt(0).toUpperCase() + p.slice(1)] = String(el[k][p]);
      });
    });
    return o;
  }
  function useTemplateCss(T) {
    var old = document.getElementById("iv-template-css");
    if (old) old.remove();
    if (T && T.css) {
      var l = document.createElement("link");
      l.id = "iv-template-css"; l.rel = "stylesheet"; l.href = T._base + T.css;
      document.head.appendChild(l);
    }
  }

  /* ---------- the renderer ---------- */
  async function renderGeneratedInvite(opts) {
    var container = opts.container;
    var events = opts.events || [];
    if (!container || !events.length) { if (container) container.style.display = "none"; return false; }

    var T = await loadTemplate((opts.settings || {}).InviteTemplate);
    useTemplateCss(T);
    var S = Object.assign({}, TEXT_DEFAULTS, templateSettings(T));
    Object.keys(opts.settings || {}).forEach(function (k) { if (opts.settings[k] !== "") S[k] = opts.settings[k]; });
    var party = await loadParty();
    var P = people(party, S);
    var loc = S.InviteLocale;
    var used = {};
    var scale = parseFloat(S.InviteSizeScale) || 1;
    var cssVar = function (v) { return String(v || "").replace(/[^#\w(),. %-]/g, ""); };
    var wrapStyle = [["--iv-card", S.InviteCardBg], ["--iv-border", S.InviteCardBorder], ["--iv-rule", S.InviteRuleColor],
      ["--iv-cover-bg", S.InviteCoverColor], ["--iv-scene-bg", S.InviteSceneColor], ["--iv-back-bg", S.InviteBackColor]]
      .filter(function (p) { return p[1]; }).map(function (p) { return p[0] + ":" + cssVar(p[1]); }).join(";");
    if (S.InviteOrnament) wrapStyle += ';--iv-ornament:url(\'' + String(S.InviteOrnament).replace(/[^\w\-.\/:%?=&]/g, "") + '\')';

    function fontFor(key) {
      var d = DEF[key];
      var v = cleanFont(S["Invite" + key + "_Font"]) || d.f;
      if (v === "display") v = cleanFont(S.InviteFontDisplay);
      if (v === "body") v = cleanFont(S.InviteFontBody);
      used[v] = 1;
      return v;
    }
    // t(): one piece of styled text
    function t(key, tag, html, cls) {
      var d = DEF[key], pre = "Invite" + key;
      var size = Math.round((parseFloat(S[pre + "_Size"]) || d.s) * scale * 100) / 100;
      var color = String(S[pre + "_Color"] || d.c).replace(/[^#\w(),. %-]/g, "");
      var weight = parseInt(S[pre + "_Weight"], 10) || (d.f === "body" ? 600 : 400);
      var style = String(S[pre + "_Style"] || (d.i ? "italic" : "normal")).toLowerCase() === "italic" ? "italic" : "normal";
      return "<" + tag + ' class="iv-t iv-' + key + (cls ? " " + cls : "") + '" style="--f:\'' + fontFor(key) +
        "',serif;--s:" + size + ";--c:" + color + ";font-weight:" + weight + ";font-style:" + style + '">' + html + "</" + tag + ">";
    }

    /* what this guest is invited to */
    var dated = events.map(function (e) { return parseDate(e.Date); }).filter(Boolean)
      .sort(function (a, b) { return a - b; });
    function dateRange() {
      if (!dated.length) return "";
      var a = dated[0], b = dated[dated.length - 1];
      var mo = function (d) { return d.toLocaleDateString(loc, { month: "long" }); };
      if (+a === +b) return a.toLocaleDateString(loc, { weekday: "long" }) + ", " + mo(a) + " " + a.getDate() + ", " + a.getFullYear();
      if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth())
        return mo(a) + " " + a.getDate() + "\u2013" + b.getDate() + ", " + a.getFullYear();
      if (a.getFullYear() === b.getFullYear())
        return mo(a) + " " + a.getDate() + " \u2013 " + mo(b) + " " + b.getDate() + ", " + a.getFullYear();
      return mo(a) + " " + a.getDate() + ", " + a.getFullYear() + " \u2013 " + mo(b) + " " + b.getDate() + ", " + b.getFullYear();
    }
    var places = [];
    events.forEach(function (e) {
      var l = String(e.Location || "").trim();
      if (l && places.indexOf(l) < 0) places.push(l);
    });
    var venue = (S.InviteVenue || (places.length === 1 ? places[0] : "") || S.VenueDetails || places[0] || "").trim();
    var closing = S.InviteClosing || S.FooterText || "";
    var range = dateRange();

    /* ---------- pages ---------- */
    var pages = [];

    // 1. cover
    var coverBg = img(S.InviteCoverBg);
    var namesHtml = (P.name1 || P.name2)
      ? t("CoverNames", "p", esc(P.name1), "iv-n1") +
        (P.name1 && P.name2 ? t("CoverAmp", "p", "&amp;") : "") +
        t("CoverNames", "p", esc(P.name2), "iv-n2")
      : t("CoverNames", "p", esc(S.HeroTitle || ""), "iv-n1");
    pages.push(
      '<section class="iv-page iv-cover" aria-label="Invitation cover"' + (coverBg ? ' style="background-image:url(\'' + coverBg + '\')"' : "") + '><div class="iv-in">' +
      '<div class="iv-cover-top">' + t("CoverIntro", "p", esc(S.InviteIntroText)) +
      '<div class="iv-names">' + namesHtml + "</div></div>" +
      '<div class="iv-cover-bottom">' + (range ? t("CoverDate", "p", esc(range), "iv-caps iv-wide") : "") +
      (venue ? t("CoverVenue", "p", esc(venue), "iv-caps iv-wide") : "") + "</div></div></section>"
    );

    // 2. picture
    if (!isOff(S.InviteShowScene) && img(S.InviteSceneImage)) {
      pages.push('<section class="iv-page iv-scene" aria-label="Illustration" style="background-image:url(\'' +
        img(S.InviteSceneImage) + '\')"></section>');
    }

    var solo = events.length === 1 && !isOff(S.InviteSoloCombine);
    var suffix = isOff(S.InviteTimeSuffix) ? "" : S.InviteTimeSuffix;
    // Icon: the InviteIcon column wins. Otherwise the template's icon-<name>.png, chosen by a keyword
    // found in the event's ID or Name (tamil, bengali, haldi, mehndi, reception, wedding), else icon-<ID>.png.
    var ICON_WORDS = ["tamil", "bengali", "haldi", "mehndi", "reception", "wedding"];
    var iconFor = function (ev) {
      if (img(ev.InviteIcon)) return img(ev.InviteIcon);
      var hay = (String(ev.ID || "") + " " + String(ev.Name || "")).toLowerCase();
      var hit = ICON_WORDS.filter(function (w) { return hay.indexOf(w) > -1; })[0];
      return T._base + "icon-" + (hit || String(ev.ID || "").toLowerCase()) + ".png";
    };

    // which event the hosts are "requesting your company at"
    var PHRASES = { mehndi: "the Mehndi function", wedding: "the wedding", reception: "the wedding reception" };
    var phraseOf = function (ev) {
      var p = String(ev.InviteRequestPhrase || "").trim();
      if (p) return p;
      var id = String(ev.ID || "").toLowerCase();
      return PHRASES[id] || ("the " + String(ev.Name || "wedding").toLowerCase());
    };
    var mainEv = events.filter(function (e) { return String(e.ID || "").trim().toUpperCase() === String(S.InviteMainEvent).trim().toUpperCase(); })[0];
    var eventPhrase = events.length === 1 ? phraseOf(events[0])
      : mainEv ? phraseOf(mainEv)
      : events.map(phraseOf).join(" " + S.InviteAndText + " ");
    var requestText = String(S.InviteRequestText).replace(/\{event\}/gi, eventPhrase);

    // 3. family page
    var hasSides = P.side1.length || P.side2.length;
    var side = function (arr) {
      return '<div class="iv-side">' + arr.map(function (n, i) {
        return t("FamilyParents", "p", esc(n) + (i < arr.length - 1 ? " &amp;" : ""));
      }).join("") + "</div>";
    };
    var grandBlock = function (groupsArr, label) {
      if (!groupsArr.length) return "";
      return '<div class="iv-grand">' + t("FamilyGrandLabel", "p", esc(label)) + groupsArr.map(function (g, gi) {
        return (gi ? t("FamilyGrandAnd", "p", esc(S.InviteAndText), "iv-gand") : "") + '<div class="iv-gpair">' +
          g.map(function (n, i) { return t("FamilyGrandNames", "p", esc(n) + (i < g.length - 1 ? " &amp;" : "")); }).join("") + "</div>";
      }).join("") + "</div>";
    };
    var famHtml = (S.InviteBlessing ? t("FamilyBlessing", "p", esc(S.InviteBlessing), "iv-blessing") : "") + '<div class="iv-orn"></div>';
    if (hasSides) {
      famHtml += '<div class="iv-parents">' +
        (P.side1.length ? side(P.side1) : "") +
        (P.side1.length && P.side2.length ? t("FamilyAnd", "span", esc(S.InviteAndText)) : "") +
        (P.side2.length ? side(P.side2) : "") + "</div>";
    }
    famHtml += t("FamilyRequest", "p", esc(requestText), "iv-req");
    if ((P.grand1.length || P.grand2.length) && (P.full1 || P.full2)) {
      famHtml += '<div class="iv-couplegrid"><div class="iv-cp">' + t("FamilyCouple", "p", esc(P.full1), "iv-cname") +
        grandBlock(P.grand1, S.InviteGroomGrandLabel) + "</div>" + t("FamilyAmp", "p", "&amp;", "iv-camp") +
        '<div class="iv-cp">' + t("FamilyCouple", "p", esc(P.full2), "iv-cname") + grandBlock(P.grand2, S.InviteBrideGrandLabel) + "</div></div>";
    } else if (P.full1 || P.full2) {
      famHtml += t("FamilyCouple", "p",
        esc(P.full1) + (P.full1 && P.full2 ? t("FamilyAmp", "span", "&amp;", "iv-inline") : "") + esc(P.full2), "iv-couple");
    }
    if (P.joy.length) {
      var j = P.joy.map(esc);
      famHtml += t("FamilyJoy", "p", esc(S.InviteJoyText) + " " +
        (j.length > 1 ? j.slice(0, -1).join(", ") + " " + esc(S.InviteAndText) + " " + j[j.length - 1] : j[0]));
    }
    famHtml += '<div class="iv-orn iv-orn-2"></div>';
    var soloIcon = "";
    if (solo) {
      // one event: the event details share the family page
      var se = events[0], sd = parseDate(se.Date), stime = fmtTime(se.Time, suffix), splace = String(se.Location || venue || "").trim();
      famHtml += t("EventLabel", "p", esc(se.Name || ""), "iv-caps iv-wide iv-slabel") +
        t("SoloDate", "p", esc(S.InviteWhenPrefix) + " " + longDate(sd, se.Date, loc), "iv-sdate") +
        (stime ? t("SoloTime", "p", esc(stime), "iv-stime") : "") +
        (splace ? t("SoloWhere", "p", esc(S.InviteWherePrefix) + " " + esc(splace), "iv-swhere") : "") +
        (se.Attire ? t("SoloAttire", "p", '<span class="iv-k iv-attire-k">' + esc(S.InviteAttireLabel) + "</span> " + esc(se.Attire), "iv-sattire") : "");
      if (!(P.grand1.length || P.grand2.length))
        soloIcon = '<img class="iv-icon iv-solo-icon" src="' + iconFor(se) + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      if (range) famHtml += t("FamilyWhen", "p", esc(S.InviteWhenPrefix) + " " + esc(range), "iv-when");
      if (venue) famHtml += t("FamilyWhere", "p", esc(S.InviteWherePrefix) + " " + esc(venue));
    }
    pages.push('<section class="iv-page iv-card iv-family" aria-label="Hosts"><div class="iv-in iv-stack' + (solo ? " iv-solo" : "") + '">' + famHtml + "</div>" +
      (soloIcon ? '<div class="iv-in iv-soloicon">' + soloIcon + "</div>" : "") + "</section>");

    // 4. events (two per page) + venue block
    var perEventPlace = places.length > 1;
    function eventSlot(ev) {
      var d = parseDate(ev.Date);
      var label = String(ev.InviteLabel || "").trim();
      var desc = String(ev.InviteDescription || "").trim() || firstPara(plain(ev.Description));
      var icon = iconFor(ev);
      var dateHtml = longDate(d, ev.Date, loc);
      var time = fmtTime(ev.Time, suffix);
      return '<div class="iv-slot">' +
        '<img class="iv-icon" src="' + icon + '" alt="" onerror="this.style.display=\'none\'">' +
        (label ? t("EventLabel", "p", esc(label), "iv-caps iv-wide") : "") +
        t("EventTitle", "h3", esc(ev.Name || ""), "iv-title") +
        (desc ? t("EventDesc", "p", esc(desc), "iv-desc") : "") +
        t("EventDate", "p", dateHtml, "iv-edate") +
        (time ? t("EventTime", "p", esc(time), "iv-etime") : "") +
        (ev.Attire ? t("EventAttire", "p", '<span class="iv-k">' + esc(S.InviteAttireLabel) + "</span> " + esc(ev.Attire), "iv-attire") : "") +
        (perEventPlace && ev.Location ? t("EventAttire", "p", '<span class="iv-k">' + esc(S.InvitePlaceLabel) + "</span> " + esc(ev.Location), "iv-attire") : "") +
        "</div>";
    }
    var venueSlot = '<div class="iv-slot iv-venue"><div class="iv-orn"></div>' +
      t("VenueLabel", "p", esc(S.InviteVenueLabel), "iv-caps iv-wide") +
      t("VenueName", "p", esc(venue)) + (closing ? t("VenueTagline", "p", esc(closing)) : "") + "</div>";

    var vmode = String(S.InviteVenueBlock || "auto").toLowerCase();
    var showVenue = !solo && !!venue && vmode !== "no" && (vmode === "yes" || (places.length <= 1 && events.length % 2 === 1));
    var slots = solo ? [] : events.map(eventSlot);
    var chunks = [];
    for (var i = 0; i < slots.length; i += 2) chunks.push(slots.slice(i, i + 2));
    if (showVenue) {
      var lastChunk = chunks[chunks.length - 1];
      if (lastChunk && lastChunk.length < 2) lastChunk.push(venueSlot); else chunks.push([venueSlot]);
    }
    chunks.forEach(function (c) {
      pages.push('<section class="iv-page iv-card iv-events' + (c.length === 1 && c[0] === venueSlot ? " iv-venue-only" : "") +
        '" aria-label="Events"><div class="iv-in">' + c.join("") + "</div></section>");
    });

    // 5. back cover
    if (!isOff(S.InviteShowBackCover)) {
      pages.push('<section class="iv-page iv-back" aria-label="Back cover"' + (img(S.InviteBackBg) ? ' style="background-image:url(\'' + img(S.InviteBackBg) + '\')"' : "") + '><div class="iv-in">' +
        (closing ? t("BackCaption", "p", esc(closing), "iv-backcap") : "") + "</div></section>");
    }

    /* ---------- put it on the page ---------- */
    loadFonts(Object.keys(used));
    container.innerHTML =
      '<div class="iv-wrap" style="' + wrapStyle + '"><div class="iv-deck" tabindex="0" aria-label="Your invitation">' + pages.join("") + "</div>" +
      '<div class="iv-ui"><button type="button" class="iv-nav" data-iv="prev" aria-label="Previous page">\u2039</button>' +
      '<span class="iv-count" aria-live="polite">1 / ' + pages.length + "</span>" +
      '<button type="button" class="iv-nav" data-iv="next" aria-label="Next page">\u203A</button></div>' +
      '<div class="invitation-actions iv-actions"><button type="button" class="invitation-link invitation-download" data-iv="print">Save invitation as PDF</button></div></div>';
    container.style.display = "block";

    var deck = container.querySelector(".iv-deck");
    var count = container.querySelector(".iv-count");
    var step = function (dir) { deck.scrollBy({ left: dir * deck.clientWidth, behavior: "smooth" }); };
    container.querySelector('[data-iv="prev"]').addEventListener("click", function () { step(-1); });
    container.querySelector('[data-iv="next"]').addEventListener("click", function () { step(1); });
    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    });
    deck.addEventListener("scroll", function () {
      var n = Math.round(deck.scrollLeft / Math.max(1, deck.clientWidth)) + 1;
      count.textContent = Math.min(n, pages.length) + " / " + pages.length;
    }, { passive: true });
    container.querySelector('[data-iv="print"]').addEventListener("click", async function () {
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
      document.body.classList.add("iv-printing");
      var done = function () { document.body.classList.remove("iv-printing"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
    });
    return true;
  }

  renderGeneratedInvite.defaults = { DEF: DEF, TEXT: TEXT_DEFAULTS };
  renderGeneratedInvite.loadTemplate = loadTemplate;
  renderGeneratedInvite.templateSettings = templateSettings;
  window.renderGeneratedInvite = renderGeneratedInvite;
})();
