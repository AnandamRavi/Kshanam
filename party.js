async function loadParty() {
  const grid = document.getElementById("party-grid");
  if (!CONFIG.PARTY_CSV_URL || CONFIG.PARTY_CSV_URL.startsWith("PASTE_")) {
    grid.innerHTML = "<p>Add your Wedding Party tab link to config.js to show people here.</p>";
    return;
  }

  try {
    const res = await fetch(CONFIG.PARTY_CSV_URL, { cache: "no-store" });
    const text = await res.text();
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

    grid.innerHTML = data
      .filter((p) => p.Name)
      .map((p) => {
        const photo = resolveImageUrl(p.PhotoURL);
        const credit = photo && (p.PhotoCredit || "").trim()
          ? `<p class="photo-credit">${String(p.PhotoCredit).trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
          : "";
        return `
          <div class="party-card">
            ${photo ? `<img src="${photo}" alt="${p.Name}" loading="lazy" onerror="this.style.display='none'">` : ""}
            ${credit}
            <h3>${p.Name}</h3>
            ${p.Role ? `<p class="role">${p.Role}</p>` : ""}
            ${p.Bio ? `<p class="bio">${p.Bio}</p>` : ""}
          </div>
        `;
      })
      .join("");
  } catch (err) {
    grid.innerHTML = "<p>Couldn't load the wedding party list right now.</p>";
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", loadParty);
