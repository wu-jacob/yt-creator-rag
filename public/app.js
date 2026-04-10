class LabelInput extends HTMLElement {
  connectedCallback() {
    const label    = this.getAttribute("label") ?? "";
    const inputId  = this.getAttribute("input-id") ?? "";
    const prefix   = this.getAttribute("prefix") ?? "";
    const placeholder = this.getAttribute("placeholder") ?? "";
    const multiline = this.hasAttribute("multiline");

    const labelEl = document.createElement("label");
    labelEl.setAttribute("for", inputId);
    labelEl.textContent = label;
    this.appendChild(labelEl);

    const sensitive = this.hasAttribute("sensitive");

    if (multiline) {
      const textarea = document.createElement("textarea");
      textarea.id = inputId;
      textarea.name = inputId;
      textarea.placeholder = placeholder;
      textarea.required = true;
      this.appendChild(textarea);
      return;
    }

    const row = document.createElement("div");
    row.className = "input-row";

    if (prefix) {
      const span = document.createElement("span");
      span.className = "prefix";
      span.textContent = prefix;
      row.appendChild(span);
    }

    const input = document.createElement("input");
    input.type = sensitive ? "password" : "text";
    input.id = inputId;
    input.name = inputId;
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.required = true;
    row.appendChild(input);

    this.appendChild(row);
  }
}

class SubmitButton extends HTMLElement {
  connectedCallback() {
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.textContent = this.textContent.trim();
    this.textContent = "";
    this.appendChild(btn);
  }

  get button() {
    return this.querySelector("button");
  }

  setLoading(loading) {
    this.button.disabled = loading;
  }
}

class StatusMessage extends HTMLElement {
  connectedCallback() {
    this._main  = document.createElement("div");
    this._steps = document.createElement("div");
    this._steps.className = "steps";
    this.appendChild(this._main);
    this.appendChild(this._steps);
  }

  showLoading(stepText = "") {
    this._main.className = "loading";
    this._main.innerHTML = '<span class="spinner"></span> Running…';
    this._steps.textContent = stepText;
  }

  updateStep(text) {
    this._steps.textContent = text;
  }

  showError(message) {
    this._main.className = "error";
    this._main.textContent = message;
    this._steps.textContent = "";
  }

  showSuccess(message) {
    this._main.className = "";
    this._main.textContent = message;
    this._steps.textContent = "";
  }

  clear() {
    this._main.className = "";
    this._main.textContent = "";
    this._steps.textContent = "";
  }
}

customElements.define("label-input",   LabelInput);
customElements.define("submit-button", SubmitButton);
customElements.define("status-message", StatusMessage);

const STEPS = [
  "Resolving channel and extracting keywords…",
  "Searching for relevant videos…",
  "Fetching transcripts…",
  "Generating answer and scanning comments…",
  "Writing Notion page…",
];

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const handle        = document.getElementById("handle").value.trim();
  const question      = document.getElementById("question").value.trim();
  const notionToken   = document.getElementById("notionToken").value.trim();
  const notionPageId  = document.getElementById("notionPageId").value.trim();
  const btn           = document.getElementById("btn");
  const status        = document.getElementById("status");

  btn.setLoading(true);

  let stepIndex = 0;
  status.showLoading(STEPS[0]);

  const stepInterval = setInterval(() => {
    stepIndex = Math.min(stepIndex + 1, STEPS.length - 1);
    status.updateStep(STEPS[stepIndex]);
  }, 8_000);

  try {
    const res  = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, question, notionToken, notionPageId }),
    });
    const data = await res.json();

    clearInterval(stepInterval);

    if (!res.ok) {
      status.showError(data.error ?? "Something went wrong.");
    } else {
      status.showSuccess("✓ Done! Opening your Notion page…");
      setTimeout(() => window.open(data.pageUrl, "_blank"), 600);
    }
  } catch {
    clearInterval(stepInterval);
    status.showError("Network error — is the server running?");
  } finally {
    btn.setLoading(false);
  }
});
