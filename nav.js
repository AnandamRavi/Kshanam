/* ==========================================================
   nav.js — keeps the top menu visible on every screen size.

   The menu is never hidden behind a button. It has two looks:
   - one tidy row of links when they all fit (it stays pinned to
     the top of the screen while the page scrolls), and
   - a neat grid of buttons when they don't (phones, narrow
     columns, or long page names set in the Settings sheet).

   Works with the existing <nav class="site-nav"> markup on every
   page; no changes to the links themselves.

   Include it on each page directly AFTER the closing </nav> tag,
   so the menu is set up before the page first paints:

     </nav>
     <script src="nav.js"></script>

   Everything visual lives in the "Navigation" part of style.css.
   ========================================================== */
(function () {
  var nav = document.querySelector(".site-nav");
  if (!nav || nav.classList.contains("is-enhanced")) return;

  // Safety check: only take over the menu if the matching styles are loaded.
  // If an older style.css is being served (or cached), leave the menu exactly
  // as it was rather than showing a half-styled one.
  var styled = getComputedStyle(document.documentElement).getPropertyValue("--polish-layer");
  if (!styled || !styled.trim()) return;

  // Put the existing links in a container (needed to measure them).
  var links = document.createElement("div");
  links.className = "site-nav-links";
  links.id = "site-nav-links";
  while (nav.firstChild) links.appendChild(nav.firstChild);
  nav.appendChild(links);
  nav.classList.add("is-enhanced");
  nav.setAttribute("aria-label", "Main");

  // Tell screen readers which page they are on.
  Array.prototype.forEach.call(links.querySelectorAll("a.active"), function (a) {
    a.setAttribute("aria-current", "page");
  });

  function visibleLinks() {
    return Array.prototype.filter.call(links.children, function (el) {
      return getComputedStyle(el).display !== "none";
    });
  }

  /* ---- choose the row or the grid ----
     Measured rather than tied to a screen width, so it also copes
     with longer page names set in the Settings sheet and with pages
     switched off there. */
  function fit() {
    nav.classList.remove("is-grid");
    nav.classList.add("is-measuring");
    var tooWide = links.scrollWidth > links.clientWidth + 1;
    nav.classList.remove("is-measuring");
    nav.classList.toggle("is-grid", tooWide);

    // Grid: 3 columns (2 when there are 4 links); a short last row
    // stretches its final button so there is no gap.
    var shown = visibleLinks();
    var n = shown.length;
    var cols = n <= 3 ? Math.max(n, 1) : (n === 4 ? 2 : 3);
    links.style.setProperty("--nav-cols", String(cols));
    shown.forEach(function (a, i) {
      var want = "";
      if (tooWide && i === n - 1 && n % cols !== 0) want = "span " + (cols - (n % cols) + 1);
      if (a.style.gridColumn !== want) a.style.gridColumn = want;
    });
  }

  var fitQueued = false;
  function queueFit() {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(function () {
      fitQueued = false;
      fit();
      checkStuck();
    });
  }

  fit();
  window.addEventListener("resize", queueFit);
  window.addEventListener("load", queueFit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);

  // The text column can change width after the page loads (for example when the
  // decorative side borders are switched on), so re-measure when the menu's own
  // width changes, not just when the window is resized.
  if (window.ResizeObserver) {
    var lastWidth = nav.clientWidth;
    new ResizeObserver(function () {
      if (nav.clientWidth !== lastWidth) {
        lastWidth = nav.clientWidth;
        queueFit();
      }
    }).observe(nav);
  }

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
     has scrolled and the one-row menu is pinned to the top ---- */
  var scrollQueued = false;
  function checkStuck() {
    scrollQueued = false;
    var pinned = !nav.classList.contains("is-grid") &&
      nav.getBoundingClientRect().top <= 0.5 && window.scrollY > 2;
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
