let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";

function setPrompt(text) {
  const input = document.getElementById("userInput");
  input.value = text;
  input.focus();
  hideError();
}

function setLoading(isLoading) {
  const sendBtn = document.getElementById("sendBtn");
  const btnText = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");

  sendBtn.disabled = isLoading;
  sendBtn.setAttribute("aria-busy", String(isLoading));

  // The redesigned HTML has a separate button label and loader.
  btnText.textContent = isLoading
    ? "Planning your trip..."
    : "Build my itinerary";

  btnLoader.classList.toggle("hidden", !isLoading);
}

function showError(message) {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  const errorBox = document.getElementById("errorBox");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

/**
 * Remove numbering from section-heading lines in common Markdown formats.
 * Handles:
 *   ## 3️⃣ Hotel Suggestions
 *   ### 3⃣ Hotel Suggestions
 *   **3️⃣ Hotel Suggestions**
 *   3️⃣ Hotel Suggestions
 *   3. Hotel Suggestions
 * It does not renumber lists or change numbered itinerary items.
 */
function cleanSectionNumbering(markdown) {
  const lines = markdown.split("\n");

  return lines
    .map((line) => {
      // First remove number/emoji prefixes from proper Markdown headings.
      if (/^\s*#{1,6}\s+/.test(line)) {
        return line.replace(
          /^(\s*#{1,6}\s+)(?:(?:\d+\uFE0F?\u20E3)|(?:\d+\uFE0F)|[①-⑳]|\d+[.)])\s*/u,
          "$1",
        );
      }

      // Promote standalone bold lines into real Markdown headings.
      // Example: **Day-by-Day Itinerary** -> ## Day-by-Day Itinerary
      // This is important because CSS cannot style a bold paragraph as an h2.
      const boldLine = line.match(/^\s*\*\*\s*(.+?)\s*\*\*\s*$/);
      if (boldLine) {
        const title = boldLine[1].trim();

        // Only promote lines that look like section/subsection titles.
        // Keep short bold labels inside paragraphs and list items unchanged.
        const looksLikeHeading =
          title.length <= 100 &&
          !/[.!?]$/.test(title) &&
          !/^https?:\/\//i.test(title);

        if (looksLikeHeading) {
          const cleanTitle = title.replace(
            /^(?:(?:\d+\uFE0F?\u20E3)|(?:\d+\uFE0F)|[①-⑳]|\d+[.)])\s*/u,
            "",
          );
          return `## ${cleanTitle}`;
        }
      }

      // Promote standalone underlined-style bold markers too.
      const underscoreLine = line.match(/^\s*__\s*(.+?)\s*__\s*$/);
      if (underscoreLine) {
        const title = underscoreLine[1].trim();
        if (title.length <= 100 && !/[.!?]$/.test(title)) {
          return `## ${title.replace(/^(?:\d+\uFE0F?\u20E3|[①-⑳]|\d+[.)])\s*/u, "")}`;
        }
      }

      // Plain numbered emoji heading lines, if any remain.
      if (/^\s*\d+\uFE0F?\u20E3\s+\p{L}/u.test(line)) {
        return line.replace(/^\s*(?:\d+\uFE0F?\u20E3|[①-⑳])\s*/u, "");
      }

      return line;
    })
    .join("\n");
}

function cleanRenderedHeadingPrefixes(resultBox) {
  // A final DOM-level pass catches heading formats that differ from Markdown.
  // It only touches heading elements, not times, budgets, or itinerary list items.
  const prefix = /^\s*(?:(?:\d+\uFE0F?\u20E3)|(?:\d+\uFE0F)|[①-⑳]|\d+[.)])\s*/u;

  resultBox.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    // Remove only the prefix from the first text node, keeping nested markup intact.
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let firstTextNode = walker.nextNode();

    while (firstTextNode && !firstTextNode.nodeValue.trim()) {
      firstTextNode = walker.nextNode();
    }

    if (firstTextNode) {
      firstTextNode.nodeValue = firstTextNode.nodeValue.replace(prefix, "");
    }
  });
}

function renderMarkdown(markdown) {
  const cleanedMarkdown = cleanSectionNumbering(markdown);

  if (typeof marked === "undefined") {
    return null;
  }

  const html = marked.parse(cleanedMarkdown);

  // Recommended: load DOMPurify before script.js.
  if (typeof DOMPurify !== "undefined") {
    return DOMPurify.sanitize(html);
  }

  return html;
}

function showResult(answer, threadId) {
  latestAnswerMarkdown = answer;

  const resultSection = document.getElementById("resultSection");
  const resultBox = document.getElementById("resultBox");
  const threadInfo = document.getElementById("threadInfo");

  const renderedHtml = renderMarkdown(answer);

  if (renderedHtml !== null) {
    resultBox.innerHTML = renderedHtml;
    cleanRenderedHeadingPrefixes(resultBox);
  } else {
    resultBox.textContent = cleanSectionNumbering(answer);
  }

  threadInfo.textContent = `Trip session · Thread ID: ${threadId}`;
  resultSection.classList.remove("hidden");

  resultSection.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
}

async function sendMessage() {
  hideError();

  const input = document.getElementById("userInput");
  const message = input.value.trim();

  if (!message) {
    showError("Please enter your travel request first.");
    input.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/travel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        thread_id: currentThreadId,
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The server returned an invalid response. Please try again.",
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || `Travel planning failed (HTTP ${response.status}).`,
      );
    }

    if (typeof data.answer !== "string" || !data.answer.trim()) {
      throw new Error("The server returned an empty travel plan.");
    }

    if (!data.thread_id) {
      throw new Error("The server response is missing the thread ID.");
    }

    currentThreadId = data.thread_id;
    localStorage.setItem("travel_thread_id", currentThreadId);
    showResult(data.answer, data.thread_id);
  } catch (error) {
    showError(
      error instanceof TypeError
        ? "Unable to reach the travel planner. Check your connection and try again."
        : error.message || "Something went wrong. Please try again.",
    );
  } finally {
    setLoading(false);
  }
}

async function copyResult() {
  const resultBox = document.getElementById("resultBox");
  const copyBtn = document.querySelector(".copy-btn");
  const text = resultBox.innerText.trim();

  if (!text) {
    showError("Generate a travel plan before copying it.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    const oldHTML = copyBtn.innerHTML;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.innerHTML = oldHTML;
    }, 1400);
  } catch {
    showError(
      "Could not copy the plan. Clipboard access may require HTTPS or localhost.",
    );
  }
}

async function downloadPDF() {
  const pdfContent = document.getElementById("pdfContent");
  const downloadBtn = document.querySelector(".download-btn");

  if (!latestAnswerMarkdown || !pdfContent) {
    showError("No travel plan available to download.");
    return;
  }

  if (typeof html2pdf === "undefined") {
    showError("The PDF library did not load. Please refresh and try again.");
    return;
  }

  const oldHTML = downloadBtn.innerHTML;
  downloadBtn.textContent = "Preparing PDF...";
  downloadBtn.disabled = true;

  const options = {
    margin: [0.42, 0.45, 0.48, 0.45],
    filename: "tripzen-travel-plan.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollY: 0,
    },
    jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    pagebreak: {
      // Avoid "avoid-all": it can cause large blank spaces in long documents.
      mode: ["css", "legacy"],
      avoid: ["h1", "h2", "h3", "h4", "tr", "blockquote"],
    },
  };

  try {
    await html2pdf().set(options).from(pdfContent).save();
  } catch {
    showError("Could not download the PDF. Please try again.");
  } finally {
    downloadBtn.innerHTML = oldHTML;
    downloadBtn.disabled = false;
  }
}

document.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.key === "Enter" && !event.repeat) {
    event.preventDefault();
    if (!document.getElementById("sendBtn").disabled) {
      sendMessage();
    }
  }
});
