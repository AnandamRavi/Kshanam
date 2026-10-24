/* Fills in the small banner image at the top of a secondary page.

   The image link lives in the page's own tab, in a column named
   BannerImage (fill in one cell, on any row). The RSVP Questions tab is
   a Key/Value list instead, so there it's a row with the key BannerImage.
   If the tab has no value, the old Settings row named in
   data-settings-key is used as a fallback. If neither has a value, the
   banner stays hidden. */

async function findTabBanner(banner) {
  const found = { url: "", credit: "" };
  const tabKey = banner.getAttribute("data-tab");
  const tabUrl = tabKey && CONFIG[tabKey];
  if (!tabUrl || tabUrl.startsWith("PASTE_")) return found;

  try {
    const res = await fetch(tabUrl, { cache: "no-store" });
    const { data } = Papa.parse(await res.text(), { header: true, skipEmptyLines: true });
    for (const r of data) {
      const key = (r.Key || "").trim();
      if (!found.url) {
        found.url = (r.BannerImage || "").trim() ||
          (key === "BannerImage" ? (r.Value || "").trim() : "");
      }
      if (!found.credit) {
        found.credit = (r.BannerCredit || "").trim() ||
          (key === "BannerCredit" ? (r.Value || "").trim() : "");
      }
    }
  } catch (err) {
    console.error("Could not read banner from tab:", err);
  }
  return found;
}

document.addEventListener("DOMContentLoaded", async function () {
  const banner = document.getElementById("page-banner");
  if (!banner) return;

  const found = await findTabBanner(banner);
  let url = resolveImageUrl(found.url);
  let credit = found.credit;
  if (!url) {
    const settings = await loadSettings();
    const settingsKey = banner.getAttribute("data-settings-key") || "";
    url = resolveImageUrl(settings[settingsKey]);
    if (!credit) credit = (settings[settingsKey.replace(/Image$/, "Credit")] || "").trim();
  }

  if (url) {
    banner.querySelector("img").src = url;
    if (credit) {
      const p = document.createElement("p");
      p.className = "cover-credit";
      p.textContent = credit;
      banner.appendChild(p);
    }
  } else {
    banner.style.display = "none";
  }
});
