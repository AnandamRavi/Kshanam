/* ==========================================================
   nav.js — makes the top menu stay in view while scrolling, and
   folds it into a "Menu" button whenever the links don't fit on
   one line (small phones, or the narrow text column on the home
   page). Works with the existing <nav class="site-nav"> markup
   on every page; no changes to the links themselves.

   Include it on each page directly AFTER the closing </nav> tag,
   so the menu is set up before the page first paints:

     </nav>
     <script src="nav.js"></script>

   Everything visual lives in the "Navigation" part of style.css.
   ========================================================== */
(function () {
  var nav = document.querySelector(".site-nav");
  if (!nav || nav.classList.contains("is-enhanced")) return;

  // Put the existing links in a container, next to a Menu button.
  var links = document.createElement("div");
  links.className = "site-nav-links";
  links.id = "site-nav-links";
  while (nav.firstChild) links.appendChild(nav.firstChild);

  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "nav-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "site-nav-links");
  toggle.innerHTML =
    '<span class="nav-toggle-icon" aria-hidden="true"></span>' +
    '<span class="nav-toggle-label">Menu</span>';

  nav.appendChild(toggle);
  nav.appendChild(links);
  nav.classList.add("is-enhanced");

  /* ---- open / close ---- */
  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  toggle.addEventListener("click", function () {
    setOpen(!nav.classList.contains("is-open"));
  });

  document.addEventListener("click", function (e) {
    if (nav.classList.contains("is-open") && !nav.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  /* ---- collapse only when the links genuinely don't fit ----
     Measured rather than tied to a screen width, so it also copes
     with longer page names set in the Settings sheet and with pages
     switched off there. */
  function fit() {
    var wasOpen = nav.classList.contains("is-open");
    nav.classList.remove("is-collapsed");
    nav.classList.add("is-measuring");
    var tooWide = links.scrollWidth > links.clientWidth + 1;
    nav.classList.remove("is-measuring");
    nav.classList.toggle("is-collapsed", tooWide);
    if (!tooWide) setOpen(false);
    else if (wasOpen) setOpen(true);
  }

  var fitQueued = false;
  function queueFit() {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(function () {
      fitQueued = false;
      fit();
    });
  }

  fit();
  window.addEventListener("resize", queueFit);
  window.addEventListener("load", queueFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);

  // settings.js renames and hides links after it loads the sheet.
  if (window.MutationObserver) {
    new MutationObserver(queueFit).observe(links, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "hidden"],
    });
  }

  /* ---- "stuck" state: the frosted bar only appears once the page
     has scrolled and the menu is pinned to the top ---- */
  var scrollQueued = false;
  function checkStuck() {
    scrollQueued = false;
    var pinned = nav.getBoundingClientRect().top <= 0.5 && window.scrollY > 2;
    nav.classList.toggle("is-stuck", pinned);
  }
  window.addEventListener(
    "scroll",
    function () {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(checkStuck);
    },
    { passive: true }
  );
  checkStuck();
})();
