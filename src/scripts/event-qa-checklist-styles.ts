// Custom properties inherit through the shadow boundary, so the panel picks up
// the TNC theme tokens when present and falls back to their values otherwise.
export const eventQaChecklistStyles = `
  :host {
    all: initial;
    --qa-green: var(--color-green, #007931);
    --qa-red: #b3261e;
    --qa-red-tint: #fbeaea;
    --qa-text: var(--default_color, #1a1a1a);
    --qa-muted: #525252;
    --qa-border: #cdcdcd;
    --qa-divider: #ebebeb;
    --qa-tint: #e6f2ea;
    --qa-sans: var(--sans-serif-fonts, "Whitney A", "Whitney B", -apple-system,
      BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    --qa-serif: var(--serif-fonts, "Chronicle Text G2 A", "Chronicle Text G2 B",
      Georgia, serif);
    position: fixed;
    right: 16px;
    bottom: 16px;
    /* Above the OneTrust cookie banner so QA isn't blocked before consent */
    z-index: 2147483647;
  }

  * {
    box-sizing: border-box;
  }

  .panel {
    width: 420px;
    max-width: calc(100vw - 32px);
    /* Leaves room for the sandbox warning banner at the top */
    max-height: calc(100vh - 76px);
    overflow-y: auto;
    background: #fff;
    color: var(--qa-text);
    border: 1px solid var(--qa-border);
    border-top: 4px solid var(--qa-green);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.2);
    font-family: var(--qa-sans);
    font-size: 15px;
    line-height: 1.45;
    text-align: left;
  }

  summary {
    display: flex;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 16px 20px;
    background: #fff;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::before {
    content: "";
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-right: 2px solid var(--qa-text);
    border-bottom: 2px solid var(--qa-text);
    transform: rotate(-45deg);
    transition: transform 0.15s;
  }

  .panel[open] summary::before {
    transform: rotate(45deg) translate(-2px, -2px);
  }

  .panel[open] summary {
    border-bottom: 1px solid var(--qa-border);
  }

  .title {
    flex-grow: 1;
    font-family: var(--qa-serif);
    font-size: 22px;
    line-height: 1.2;
  }

  .status {
    flex-shrink: 0;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .status--pass {
    background: var(--qa-tint);
    color: var(--qa-green);
  }

  .status--fail {
    background: var(--qa-red-tint);
    color: var(--qa-red);
  }

  .body {
    padding: 2px 20px 16px;
  }

  h4 {
    margin: 14px 0 2px;
    padding-bottom: 5px;
    border-bottom: 2px solid var(--qa-green);
    color: var(--qa-green);
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    position: relative;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px solid var(--qa-divider);
    word-break: break-word;
  }

  li:last-child {
    border-bottom: none;
  }

  .badge {
    flex-shrink: 0;
    min-width: 46px;
    margin-top: 1px;
    padding: 3px 6px;
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0.05em;
    line-height: 1.2;
    text-align: center;
  }

  .badge--pass {
    background: var(--qa-green);
  }

  .badge--fail {
    background: var(--qa-red);
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .result strong {
    font-weight: bold;
  }

  .value {
    color: var(--qa-muted);
  }

  .note {
    margin: 8px 0 0;
    padding: 10px 12px;
    background: var(--qa-tint);
    color: var(--qa-text);
    font-size: 13px;
  }

  label {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    cursor: pointer;
  }

  input[type="checkbox"] {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin: 1px 0 0;
    accent-color: var(--qa-green);
    cursor: pointer;
  }

  .info {
    display: inline-block;
    width: 18px;
    height: 18px;
    margin: 0 0 0 2px;
    padding: 0;
    vertical-align: text-bottom;
    border: 1px solid var(--qa-green);
    border-radius: 50%;
    background: #fff;
    color: var(--qa-green);
    font-family: var(--qa-serif);
    font-size: 12px;
    font-style: italic;
    font-weight: bold;
    line-height: 16px;
    text-align: center;
    cursor: help;
  }

  .info:hover,
  .info:focus-visible {
    background: var(--qa-green);
    color: #fff;
  }

  .tooltip {
    display: none;
    position: absolute;
    top: calc(100% - 4px);
    left: 30px;
    right: 0;
    z-index: 1;
    padding: 10px 12px;
    background: var(--qa-text);
    color: #fff;
    font-size: 14px;
    line-height: 1.45;
    white-space: pre-line;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  li:has(.info:hover) > .tooltip,
  li:has(.info:focus-visible) > .tooltip {
    display: block;
  }

  .copy {
    width: 100%;
    margin: 12px 0 0;
    padding: 15px;
    border: none;
    border-radius: 0;
    background: var(--qa-green);
    color: #fff;
    font-family: var(--qa-sans);
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .copy:hover,
  .copy:focus-visible {
    background: var(--qa-text);
  }
`;
