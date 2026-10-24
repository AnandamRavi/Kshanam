async function loadFaqs() {
  const list = document.getElementById("faq-list");
  if (!CONFIG.FAQ_CSV_URL || CONFIG.FAQ_CSV_URL.startsWith("PASTE_")) {
    list.innerHTML = "<p>Add your FAQ tab link to config.js to show questions here.</p>";
    return;
  }

  try {
    const res = await fetch(CONFIG.FAQ_CSV_URL, { cache: "no-store" });
    const text = await res.text();
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

    list.innerHTML = data
      .filter((f) => f.Question)
      .map(
        (f) => `
          <details class="faq-item">
            <summary>${f.Question}</summary>
            <p class="answer">${f.Answer || ""}</p>
          </details>
        `
      )
      .join("");
  } catch (err) {
    list.innerHTML = "<p>Couldn't load the FAQ list right now.</p>";
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", loadFaqs);
