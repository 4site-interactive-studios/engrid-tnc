import { ENGrid, EngridLogger } from "@4site/engrid-scripts";
import { eventQaChecklistStyles } from "./event-qa-checklist-styles";

declare global {
  interface Window {
    EngagingNetworks: any;
  }
}

interface AutomatedCheck {
  label: string;
  value: string;
  passed: boolean;
}

interface ManualCheck {
  id: string;
  label: string;
  tooltip: string;
  checked: boolean;
  paidTicketsOnly?: boolean;
  paymentOnly?: boolean;
}

export class EventQaChecklist {
  private logger: EngridLogger = new EngridLogger(
    "EventQaChecklist",
    "black",
    "gold",
    "✅"
  );
  private paymentChecks: AutomatedCheck[] = [];
  private isFreeEvent = false;
  private manualChecks: ManualCheck[] = [
    {
      id: "cost-of-goods",
      label: "Cost of Goods / Fair Market Value",
      tooltip:
        "Every paid ticket type should have a cost and an associated Cost of Goods/Fair Market Value configured. The Cost of Goods should not be left blank. This can be applied in the Ticket Settings.",
      checked: false,
      paidTicketsOnly: true,
    },
    {
      id: "additional-gateways",
      label:
        "Additional gateways (PayPal, DAF, digital wallets) are live and configured",
      tooltip: `Manually check that any additional payment types are using their Production gateway under Page Settings > Donation Settings.
        The Additional Merchants should be:
          ACH Vantiv Worldpay Production (Payment Type = ACH)
          PayPal Production (Payment Type = Paypal)
          Stripe Production (Currency = Any)`,
      checked: false,
      paymentOnly: true,
    },
    {
      id: "receipt-autoresponder",
      label: "Receipt autoresponder configured",
      tooltip:
        "If the event is paid, in the autoresponder, the ‘Receipt with Advantage’ should be set to the ‘Receipt with Cost of Goods’",
      checked: false,
      paidTicketsOnly: true,
    },
    {
      id: "plain-text-email",
      label: "Plain text email generation",
      tooltip:
        "If there is an autoresponder configured, within the Plain Text Editor tab, the “Generate Plain Text from HTML” should have been manually executed",
      checked: false,
    },
    {
      id: "additional-designation",
      label: "Event Additional Designation configured",
      tooltip:
        "Make sure your event has an Event Additional Designation set under Page Settings > Campaign References.",
      checked: false,
      paymentOnly: true,
    },
    {
      id: "waitlist",
      label: "Waitlist configured - If Applicable",
      tooltip:
        "If your event has a waitlist for tickets, make sure these 3 emails are configured under Right Sidebar > Auto-responders: Join waitlist email, Ticket claim email, and Cancel waitlist email.",
      checked: false,
    },
    {
      id: "automatic-expiration",
      label: "Automatic expiration date configured",
      tooltip:
        "In the event page settings, configure the page to automatically expire after the event date has passed.",
      checked: false,
    },
    {
      id: "live-status",
      label: "Live status",
      tooltip: "The page should be set to Live under Page Settings > Status.",
      checked: false,
    },
  ];

  constructor() {
    if (!this.shouldRun()) return;
    this.logger.log("Running event QA checklist");
    this.runAutomatedChecks();
    this.restoreManualChecks();
    this.render();
  }

  private shouldRun(): boolean {
    return (
      ENGrid.demo &&
      ENGrid.getPageType() === "EVENT" &&
      ENGrid.getPageNumber() === 1
    );
  }

  private runAutomatedChecks() {
    const tickets = this.getTickets();
    const hasAdditionalDonation = !!document.querySelector(
      ".en__additional__input"
    );

    const hasOnlyFreeTickets =
      tickets.length > 0 &&
      tickets.every((t) => t.check.passed && t.price === 0);
    this.isFreeEvent = hasOnlyFreeTickets && !hasAdditionalDonation;

    this.manualChecks = this.manualChecks.filter(
      (check) =>
        (!hasOnlyFreeTickets || !check.paidTicketsOnly) &&
        (!this.isFreeEvent || !check.paymentOnly)
    );

    if (this.isFreeEvent) return;

    this.paymentChecks = [
      this.getFieldCheck("Source Code", "supporter.appealCode"),
      this.getFieldCheck("Revenue Category", "transaction.othamt4"),
      this.getFieldCheck("Application Other Type", "transaction.othamt1"),
      this.getGatewayCheck(),
    ];
  }

  private get storageKey(): string {
    return `eventQaChecklist.${ENGrid.getPageID()}`;
  }

  private restoreManualChecks() {
    let savedState: string | null;
    try {
      savedState = localStorage.getItem(this.storageKey);
    } catch (error) {
      this.logger.warn("Unable to read saved manual checklist state", error);
      return;
    }

    if (!savedState) return;

    try {
      const parsedState: unknown = JSON.parse(savedState);
      if (
        !parsedState ||
        typeof parsedState !== "object" ||
        Array.isArray(parsedState)
      ) {
        this.logger.warn("Ignoring invalid saved manual checklist state");
        return;
      }

      const checkedById = parsedState as Record<string, unknown>;
      this.manualChecks.forEach((check) => {
        check.checked = checkedById[check.id] === true;
      });
    } catch (error) {
      this.logger.warn("Unable to parse saved manual checklist state", error);
    }
  }

  private saveManualChecks() {
    const checkedById: Record<string, boolean> = {};
    this.manualChecks.forEach((check) => {
      checkedById[check.id] = check.checked;
    });

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(checkedById));
    } catch (error) {
      this.logger.warn("Unable to save manual checklist state", error);
    }
  }

  private getTickets(): { price: number; check: AutomatedCheck }[] {
    const tickets = [...document.querySelectorAll(".en__ticket")];
    // EventPages strips the "/code" suffix from hidden ticket names in the
    // DOM, so the original names are read from pageJson where possible.
    const pageJsonTickets: { name?: string }[] =
      (window as any).pageJson?.tickets || [];
    const useOriginalNames = pageJsonTickets.length === tickets.length;

    return tickets.map((ticket, index) => {
      const rawName =
        (useOriginalNames && pageJsonTickets[index].name?.trim()) ||
        ticket.querySelector(".en__ticket__name")?.textContent?.trim() ||
        "Unnamed ticket";
      const [name, hiddenCode] = rawName.split("/").map((part) => part.trim());
      const priceText =
        ticket.querySelector(".en__ticket__price")?.textContent?.trim() || "";
      const currency =
        ticket.querySelector(".en__ticket__currency")?.textContent?.trim() ||
        "";
      const numericPrice = priceText.replace(/[^0-9.]/g, "");
      const price = parseFloat(numericPrice);
      const passed = numericPrice !== "" && !isNaN(price) && currency !== "";
      const ticketType = !passed
        ? "TICKET"
        : price === 0
        ? "FREE TICKET"
        : "PAID TICKET";
      const priceValue = passed
        ? currency === "USD"
          ? `$${price.toFixed(2)}`
          : `${price.toFixed(2)} ${currency}`
        : `${priceText || "no price"} ${currency || "no currency"}`;

      return {
        price: passed ? price : 0,
        check: {
          label: `${hiddenCode ? "HIDDEN " : ""}${ticketType} – ${name}`,
          value: hiddenCode
            ? `${priceValue} – reveal with ?code=${hiddenCode}`
            : priceValue,
          passed,
        },
      };
    });
  }

  private getFieldCheck(label: string, fieldName: string): AutomatedCheck {
    if (!ENGrid.getField(fieldName)) {
      return { label, value: "Field not on page", passed: false };
    }
    const value = ENGrid.getFieldValue(fieldName).trim();
    return { label, value: value || "Empty", passed: value !== "" };
  }

  private getGatewayCheck(): AutomatedCheck {
    const label = "Main Payment Gateway";
    const environment = window.EngagingNetworks?.vault?.environment;

    if (!environment) {
      return { label, value: "Gateway info not found", passed: false };
    }
    if (environment === "sandbox") {
      return { label, value: "Test (sandbox)", passed: false };
    }
    return { label, value: `Live (${environment})`, passed: true };
  }

  private render() {
    const host = document.createElement("div");
    host.className = "event-qa-checklist";
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = eventQaChecklistStyles;
    shadow.appendChild(style);

    const panel = document.createElement("details");
    panel.className = "panel";
    panel.open = true;
    shadow.appendChild(panel);

    const summary = document.createElement("summary");
    summary.className = "panel-heading";
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = "Event QA checklist";
    const failCount = this.paymentChecks.filter(
      (check) => !check.passed
    ).length;
    const status = document.createElement("span");
    status.className = `status status--${failCount ? "fail" : "pass"}`;
    status.textContent = failCount ? `${failCount} failed` : "All passed";
    summary.append(title, status);
    panel.appendChild(summary);

    const body = document.createElement("div");
    body.className = "body";
    panel.appendChild(body);

    if (this.isFreeEvent) {
      const paymentHeading = document.createElement("h4");
      paymentHeading.textContent = "Payment";
      body.appendChild(paymentHeading);
      body.appendChild(this.createNote("Free event – payment checks skipped."));
    } else {
      body.appendChild(
        this.createSection(
          "Payment",
          this.createAutomatedList(this.paymentChecks),
          this.paymentChecks
        )
      );
    }

    const manualHeading = document.createElement("h4");
    manualHeading.textContent = "Manual";
    const manualList = this.createManualList();
    body.append(manualHeading, manualList);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "copy";
    copyButton.textContent = "Copy QA Checklist to Clipboard";
    copyButton.addEventListener("click", () => this.copy(copyButton));
    body.appendChild(copyButton);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "reset";
    resetButton.innerHTML = `
      <svg class="reset-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      Reset manual checks
    `;
    resetButton.addEventListener("click", () =>
      this.resetManualChecks(manualList)
    );
    body.appendChild(resetButton);

    document.body.appendChild(host);
  }

  private getPageName(): string {
    return (window as any).pageJson?.pageName || document.title;
  }

  private createSection(
    heading: string,
    content: HTMLElement,
    checks: AutomatedCheck[]
  ): HTMLElement {
    const section = document.createElement("details");
    section.className = "section";
    const failCount = checks.filter((check) => !check.passed).length;
    // Sections with nothing failing start collapsed so QA only sees problems
    section.open = failCount > 0;

    const summary = document.createElement("summary");
    summary.className = "section-heading";
    const label = document.createElement("span");
    label.textContent = heading;
    const status = document.createElement("span");
    status.className = `section-status section-status--${
      failCount ? "fail" : "pass"
    }`;
    status.textContent = failCount ? `${failCount} failed` : "All passed";
    summary.append(label, status);
    section.append(summary, content);
    return section;
  }

  private createNote(text: string): HTMLElement {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = text;
    return note;
  }

  private createResultItem(check: AutomatedCheck): HTMLElement {
    const item = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = `badge badge--${check.passed ? "pass" : "fail"}`;
    badge.textContent = check.passed ? "PASS" : "FAIL";
    const text = document.createElement("span");
    text.className = "result";
    const label = document.createElement("strong");
    label.textContent = check.label;
    const value = document.createElement("span");
    value.className = "value";
    value.textContent = check.value;
    text.append(label, value);
    item.append(badge, text);
    return item;
  }

  private createAutomatedList(checks: AutomatedCheck[]): HTMLElement {
    const list = document.createElement("ul");
    checks.forEach((check) => {
      list.appendChild(this.createResultItem(check));
    });
    return list;
  }

  private createManualList(): HTMLElement {
    const list = document.createElement("ul");
    this.manualChecks.forEach((check, index) => {
      const item = document.createElement("li");
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = check.checked;
      checkbox.addEventListener("change", () => {
        check.checked = checkbox.checked;
        this.saveManualChecks();
      });
      const text = document.createElement("span");
      text.textContent = check.label;
      label.append(checkbox, text);
      item.appendChild(label);

      if (check.tooltip) {
        const tooltipId = `manual-check-tooltip-${index}`;
        const info = document.createElement("button");
        info.type = "button";
        info.className = "info";
        info.textContent = "i";
        info.setAttribute("aria-label", `More about ${check.label}`);
        info.setAttribute("aria-describedby", tooltipId);
        const tooltip = document.createElement("span");
        tooltip.className = "tooltip";
        tooltip.id = tooltipId;
        tooltip.setAttribute("role", "tooltip");
        tooltip.textContent = check.tooltip;
        // Inline in the label text so the icon follows the last word when
        // it wraps; buttons inside a label don't toggle its checkbox.
        text.append(" ", info);
        item.appendChild(tooltip);
      }

      list.appendChild(item);
    });
    return list;
  }

  private resetManualChecks(list: HTMLElement) {
    this.manualChecks.forEach((check) => {
      check.checked = false;
    });
    list
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });

    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      this.logger.warn("Unable to clear saved manual checklist state", error);
    }
  }

  private toMarkdownLines(checks: AutomatedCheck[]): string[] {
    const lines: string[] = [];
    checks.forEach((check) => {
      lines.push(
        `- [${check.passed ? "x" : " "}] ${check.passed ? "PASS" : "FAIL"} ${
          check.label
        }: ${check.value}`
      );
    });
    return lines;
  }

  private getMarkdown(): string {
    const date = new Date().toISOString().slice(0, 10);
    const lines = [
      `### Event QA – ${this.getPageName()} (ID ${ENGrid.getPageID()}) – ${date}`,
      "**Payment**",
    ];

    if (this.isFreeEvent) {
      lines.push("- Free event – payment checks skipped");
    } else {
      lines.push(...this.toMarkdownLines(this.paymentChecks));
    }

    lines.push("**Manual**");
    this.manualChecks.forEach((check) => {
      lines.push(`- [${check.checked ? "x" : " "}] ${check.label}`);
    });

    return lines.join("\n");
  }

  private async copy(button: HTMLButtonElement) {
    const markdown = this.getMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      button.textContent = "Copied!";
    } catch (e) {
      this.logger.log("Clipboard API unavailable, falling back to execCommand");
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      button.textContent = document.execCommand("copy")
        ? "Copied!"
        : "Copy failed";
      textarea.remove();
    }
    setTimeout(
      () => (button.textContent = "Copy QA Checklist to Clipboard"),
      2000
    );
  }
}
