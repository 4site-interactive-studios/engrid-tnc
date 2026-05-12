import { EngridLogger, ENGrid } from "@4site/engrid-scripts";

interface EventDetails {
  event_name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  time?: string;
  location?: string;
  [key: string]: string | undefined;
}

interface BillingInfo {
  totalAmount: number;
  currency: string;
  lineItems: EventLineItem[];
}

interface EventLineItem {
  name: string;
  quantity: number;
  price: number;
  currency: string;
}

export class EventPages {
  private logger: EngridLogger = new EngridLogger(
    "Event Pages",
    "white",
    "#D62F5B",
    "📅"
  );
  private dataLayer = (window as any).dataLayer || [];

  constructor() {
    const eventDetailTable = document.querySelector("table#event-summary") as HTMLTableElement | null;
    if (this.shouldRun()) {
      this.init(eventDetailTable);
    } else if (eventDetailTable) {
      // There is at least an event details table on the page, but we're not on an event page. 
      // This likely means that we're on a waitlist page, which also uses the event block.
      ENGrid.setBodyData("event-page", "waitlist");
      this.logger.log("On event waitlist page, initializing event block with available event details.");
      const eventDetails = this.parseEventDetails(eventDetailTable);
      this.createEventBlock(eventDetailTable, eventDetails);
    }
  }

  private init(eventDetailTable: HTMLTableElement | null) {
    this.logger.log("EventPages initialized");
    switch (ENGrid.getPageNumber()) {
      case 1:
        this.logger.log("On event details page");
        ENGrid.setBodyData("event-page", "details");
        if (!eventDetailTable) {
          this.logger.warn("Could not find event details table.");
          return;
        }
        const eventDetails = this.parseEventDetails(eventDetailTable);
        localStorage.setItem("eventDetails", JSON.stringify(eventDetails));
        this.updateTicketRows();
        this.createEventBlock(eventDetailTable, eventDetails);
        this.removeEnAdditionalLine();
        this.createAdditionalDonationBlock();
        this.createPromoCodeBlock();
        this.addTotalAmountListener();
        break;
      case 2:
        this.logger.log("On event checkout page");
        ENGrid.setBodyData("event-page", "checkout");
        const billingInfo = this.getBillingInfo();
        this.updateRegistrantsFieldsets();
        if (billingInfo && billingInfo.totalAmount === 0) {
          ENGrid.setBodyData("free-event", "true");
          this.handleFreeEvent();
        }
        this.dataLayer.push({
          event: "EN_EVENT_CHECKOUT_PAGE_VIEW",
          pageId: ENGrid.getPageID(),
          eventDetails: this.getEventDetails(),
          billingInfo
        });
        break;
      default:
        if (ENGrid.isThankYouPage()) {
          this.logger.log("On thank you page");
          ENGrid.setBodyData("event-page", "thank-you");
          this.displayEventSummaryOnThankYouPage();
          const billingInfo = this.getBillingInfo();
          if (billingInfo && billingInfo.totalAmount === 0) {
            ENGrid.setBodyData("free-event", "true");
          }
          this.dataLayer.push({
            event: "EN_EVENT_THANK_YOU_PAGE_VIEW",
            pageId: ENGrid.getPageID(),
            eventDetails: this.getEventDetails(),
            billingInfo,
          });
        } else {
          ENGrid.setBodyData("event-page", "unknown");
          this.logger.warn("Unknown event page number: " + ENGrid.getPageNumber());
        }
    }
    this.updateOrderSummaryTable();
    this.formatAllAmounts();
  }

  private shouldRun() {
    return ENGrid.getPageType() === "EVENT";
  }

  private getEventDetails(): Partial<EventDetails> | null {
    const data = localStorage.getItem("eventDetails");
    return data ? JSON.parse(data) as Partial<EventDetails> : null;
  }

  private getBillingInfo(): BillingInfo | null {
    const data = localStorage.getItem("billingInfo");
    return data ? JSON.parse(data) as BillingInfo : null;
  }

  private parseEventDetails(eventDetailTable: HTMLTableElement): Partial<EventDetails> {
    const eventDetails: Partial<EventDetails> = {};
    eventDetailTable.querySelectorAll("tr").forEach((row) => {
      const header = row.querySelector("input")?.value?.trim();
      const value = row.querySelector("td")?.textContent?.trim().replace(/[\n\t]+/g, " ");
      if (header && value) {
        this.logger.log(`Parsed event detail - ${header}: ${value}`);
        eventDetails[header.toLowerCase().replace(/\s+/g, "_")] = value;
      }
    });
    return eventDetails;
  }

  private updateTicketRows() {
    const urlParamsCode = new URLSearchParams(window.location.search).get("code");
    this.logger.log(`URL promo code parameter: ${urlParamsCode ?? '<none>'}`);
    document.querySelectorAll('.en__ticket').forEach((ticket) => {
      const ticketNameElement = ticket.querySelector('.en__ticket__name');
      // Handle Hidden Tickets
      const ticketNameRaw = ticketNameElement?.textContent?.trim() || "Unknown Ticket";
      const ticketName = ticketNameRaw.split('/');
      if (ticketName.length > 1) {
        ticketNameElement!.textContent = ticketName[0].trim();
        if (!urlParamsCode || urlParamsCode !== ticketName[1].trim()) {
          this.logger.log(`Hiding ticket "${ticketName[0].trim()}" because it requires promo code "${ticketName[1].trim()}" which is not present in the URL parameters.`);
          ticket.classList.add("hide");
        }
      }
      // Relocate quantity remaining
      const quantityRemainingElement = ticket.querySelector('.en__ticket__remaining');
      if (quantityRemainingElement) {
        quantityRemainingElement.parentElement?.insertAdjacentElement("afterend", quantityRemainingElement);
      }
    });
  }

  private createEventBlock(eventDetailTable: HTMLTableElement, eventDetails: Partial<EventDetails>) {
    const eventSummary = document.createElement("event-summary");

    const overlay = document.createElement("div");
    overlay.className = "engrid__eventdetails__overlay";

    const title = document.createElement("h2");
    title.className = "engrid__eventdetails__title";
    title.textContent = eventDetails.event_name || "Event Name Not Available";
    overlay.appendChild(title);

    const description = document.createElement("p");
    description.className = "engrid__eventdetails__description";
    description.textContent = eventDetails.description || "Event Description Not Available.";
    overlay.appendChild(description);

    const date = document.createElement("time");
    date.className = "engrid__eventdetails__date";
    date.textContent = eventDetails.start_date && eventDetails.end_date
      ? `${eventDetails.start_date} - ${eventDetails.end_date}`
      : "Event Date Not Available";
    overlay.appendChild(date);

    const locationWrapper = document.createElement("div");
    locationWrapper.className = "engrid__eventdetails__location-wrapper";

    const location = document.createElement("address");
    location.className = "engrid__eventdetails__location";
    if (eventDetails.location) {
      const locationLink = document.createElement("a");
      locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventDetails.location)}`;
      locationLink.target = "_blank";
      locationLink.textContent = eventDetails.location;
      location.appendChild(locationLink);
    } else {
      location.textContent = "Event Location Not Available";
    }
    locationWrapper.appendChild(location);

    const time = document.createElement("time");
    time.className = "engrid__eventdetails__time";
    time.textContent = eventDetails.time || "";
    locationWrapper.appendChild(time);

    overlay.appendChild(locationWrapper);
    eventSummary.appendChild(overlay);

    eventDetailTable.parentElement?.insertBefore(eventSummary, eventDetailTable);
  }

  private removeEnAdditionalLine() {
    const additionalLine = document.querySelector(".en__additional");
    if (additionalLine) {
      additionalLine.remove();
      this.logger.log("Removed default additional donation line.");
    } else {
      this.logger.warn("Could not find default additional donation line to remove.");
    }
  }

  private createAdditionalDonationBlock() {
    const insertLocation = document.querySelector(".event-additional");
    if (insertLocation) {
      const additionalDonationBlock = document.createElement("input");
      additionalDonationBlock.type = "text";
      additionalDonationBlock.inputMode = "decimal";
      additionalDonationBlock.className = "en__additional__input";
      additionalDonationBlock.name = "event.additionalAmount";
      additionalDonationBlock.setAttribute("aria-label", "Add a Donation (optional)");
      additionalDonationBlock.addEventListener("blur", () => {
        const value = additionalDonationBlock.value.replace(/[^0-9.]/g, "");
        if (value) {
          additionalDonationBlock.value = parseFloat(value).toFixed(2);
        } else {
          additionalDonationBlock.value = "";
        }
      });
      insertLocation.appendChild(additionalDonationBlock);
    } else {
      this.logger.warn("Could not find location to insert additional donation block.");
    }
  }

  private createPromoCodeBlock() {
    const insertLocation = document.querySelector(".event-promo");
    if (insertLocation && insertLocation.children.length > 0) {
      const additionalCodeBlock = document.createElement("input");
      additionalCodeBlock.type = "text";
      additionalCodeBlock.inputMode = "text";
      additionalCodeBlock.className = "en__code__input";
      additionalCodeBlock.name = "event.discount";
      additionalCodeBlock.maxLength = 35;
      additionalCodeBlock.setAttribute("aria-label", "Add a Promo Code");
      insertLocation.children[0].insertAdjacentElement("afterend", additionalCodeBlock);
    } else {
      this.logger.warn("Could not find location to insert additional promo code block.");
    }
  }

  private updateOrderSummaryTable() {
    const orderSummary = document.querySelector(".en__orderSummary");
    if (!orderSummary) {
      this.logger.warn("Could not find order summary table to update.");
      return;
    }

    const promoElements = orderSummary.querySelectorAll(".en__orderSummary__data--promo");
    let hasPromo = false;
    promoElements.forEach((promo) => {
      const code = promo.textContent?.trim() || "";
      if (code !== "" && code !== "0") {
        this.logger.log(`Promo code detected: ${code}`);
        hasPromo = true;
        this.addPromoRow(code);
      }
    });
    ENGrid.setBodyData("event-has-promo", hasPromo ? "true" : "false");

    orderSummary.querySelectorAll(".en__orderSummary__headers div").forEach((header) => {
      header.textContent = header.textContent?.replace(":", "").trim() || "";
    });

    orderSummary.querySelectorAll(".en__orderSummary__item").forEach((item) => {
      const quantityElement = item.querySelector(".en__orderSummary__data--quantity");
      const typeElement = item.querySelector(".en__orderSummary__data--type");
      if (quantityElement && typeElement) {
        const quantityText = quantityElement.textContent?.trim() || "";
        let typeText = typeElement.textContent?.trim() || "";
        typeText = typeText.split('/')[0].trim();
        typeElement.textContent = `${quantityText}x ${typeText}`;
      }
    });

    const additional = orderSummary.querySelector(".en__orderSummary__additional");
    if (additional) {
      const costElement = additional.querySelector(".en__orderSummary__data--cost");
      if (costElement) {
        const costText = costElement.textContent?.trim().replace(/[^0-9.]/g, "") || "";
        if (costText === "0" || costText === "0.00" || costText === "") {
          additional.remove();
          this.logger.log("Removed additional donation line item with 0 cost.");
        }
      }
    }
  }

  private updateRegistrantsFieldsets() {
    document.querySelectorAll(".en__registrants__registrantDetails").forEach((element) => {
      element.classList.add("i1-50", "i2-50");
      element.querySelectorAll(".en__field").forEach((field) => {
        field.classList.add("i-required", "en__mandatory");
        const input = field.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) {
          input.required = true;
          const label = field.querySelector("label");
          const labelText = label ? label.textContent?.trim() : "";
          const capitalizedLabel = labelText ? labelText.replace(/\b\w/g, (char) => char.toUpperCase()) : "";
          input.placeholder = capitalizedLabel + "*";
        }
      });
    });
  }

  private handleFreeEvent() {
    // Check if the total is 0, and if so hide the payment section and change the submit button text to "Submit"
    // Also, if any headers contain "Billing" change that to "Your"
    const submitButton = document.querySelector(".en__submit button") as HTMLButtonElement | null;
    if (submitButton) {
      submitButton.textContent = "Submit";
      // Engaging Networks will keep changing submit back to "Submit Payment"
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && submitButton.textContent?.trim() !== "Submit") {
            submitButton.textContent = "Submit";
            observer.disconnect();
          }
        });
      });
      observer.observe(submitButton, { childList: true });
    }
    document.querySelectorAll(".en__orderSummary__headers div").forEach((header) => {
      if (header.textContent?.trim().toLowerCase().includes("billing")) {
        header.textContent = header.textContent.replace(/billing/i, "Your");
      }
    });
  }

  private addPromoRow(code: string) {
    const billingInfo = this.getBillingInfo();
    const currentTotal = document.querySelector(".en__orderSummary__data--totalAmount")?.textContent?.trim().replace(/[^0-9.]/g, "") || "";
    if (billingInfo && currentTotal) {
      const promoRow = document.createElement("div");
      promoRow.className = "en__orderSummary__item en__orderSummary__promo";
      promoRow.innerHTML = `
        <div class="en__orderSummary__data en__orderSummary__data--type">Applied Promo Code</div>
        <div class="en__orderSummary__data en__orderSummary__data--item"></div>
        <div class="en__orderSummary__data en__orderSummary__data--promo">${code}</div>
        <div class="en__orderSummary__data en__orderSummary__data--cost">${parseFloat(currentTotal) - billingInfo.totalAmount}</div>
      `;

      const totalAmountRow = document.querySelector(".en__orderSummary__total");
      if (totalAmountRow) {
        totalAmountRow.insertAdjacentElement("beforebegin", promoRow);
      } else {
        this.logger.warn("Could not find total amount row to insert promo code discount row before.");
        return;
      }

      document.querySelectorAll(".en__orderSummary__item:not(.en__orderSummary__promo)").forEach((item) => {
        const typeElement = item.querySelector(".en__orderSummary__data--type");
        const costElement = item.querySelector(".en__orderSummary__data--cost");
        const codeElement = item.querySelector(".en__orderSummary__data--promo");
        if (codeElement) {
          codeElement.textContent = "";
        }
        if (typeElement && costElement) {
          const lineItem = billingInfo.lineItems.find((lineItem) => typeElement.textContent?.includes(lineItem.name));
          const originalPrice = lineItem ? lineItem.price * lineItem.quantity : parseFloat(costElement.textContent?.replace(/[^0-9.]/g, "") || "0");
          costElement.textContent = `${originalPrice} ${lineItem?.currency || billingInfo.currency || "USD"}`;
        }
      });
    } else {
      this.logger.warn("Billing info not found in localStorage. Cannot display promo code discount row, instead the line item will show the discount baked in.");
    }
  }

  private addTotalAmountListener() {
    const additionalInput = document.querySelector(".en__additional__input");
    if (additionalInput) {
      additionalInput.addEventListener("change", () => {
        this.updateTotalAmount();
      });
    }

    document.querySelectorAll(".en__ticket__minus, .en__ticket__plus").forEach((el) => {
      el.addEventListener("click", () => {
        setTimeout(() => {
          this.updateTotalAmount();
        }, 100);
      });
    });

    const resetButton = document.querySelector('button[type="reset"]');
    if (resetButton) {
      resetButton.addEventListener("click", () => {
        setTimeout(() => {
          this.updateTotalAmount();
        }, 100);
      });
    }

    this.updateTotalAmount();
  }

  private displayEventSummaryOnThankYouPage() {
    const eventSummaryData = localStorage.getItem("eventDetails");
    if (eventSummaryData) {
      const eventDetails: Partial<EventDetails> = JSON.parse(eventSummaryData);
      const insertLocation = document.querySelector(".event-summary-placeholder");
      if (insertLocation) {
        const eventSummaryBlock = document.createElement("event-summary");

        const confirmationDetails = document.createElement("div");
        confirmationDetails.className = "event-confirmation-details";

        const title = document.createElement("h2");
        title.className = "engrid__eventdetails__title";
        title.textContent = eventDetails.event_name || "";
        confirmationDetails.appendChild(title);

        if (eventDetails.description) {
          const description = document.createElement("p");
          description.className = "engrid__eventdetails__description";
          description.textContent = eventDetails.description;
          confirmationDetails.appendChild(description);
        }

        const tbody = document.createElement("tbody");

        const dateValue = eventDetails.start_date && eventDetails.end_date
          ? `${eventDetails.start_date}-${eventDetails.end_date}`
          : eventDetails.start_date || "";
        if (dateValue) {
          const dateRow = document.createElement("tr");
          const dateLabelCell = document.createElement("td");
          dateLabelCell.textContent = "Date";
          const dateValueCell = document.createElement("td");
          dateValueCell.textContent = dateValue;
          dateRow.appendChild(dateLabelCell);
          dateRow.appendChild(dateValueCell);
          tbody.appendChild(dateRow);
        }

        if (eventDetails.location) {
          const locationRow = document.createElement("tr");
          const locationLabelCell = document.createElement("td");
          locationLabelCell.textContent = "Location";
          const locationValueCell = document.createElement("td");
          const locationLink = document.createElement("a");
          locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventDetails.location)}`;
          locationLink.target = "_blank";
          locationLink.textContent = eventDetails.location;
          locationValueCell.appendChild(locationLink);
          locationRow.appendChild(locationLabelCell);
          locationRow.appendChild(locationValueCell);
          tbody.appendChild(locationRow);
        }

        if (eventDetails.time) {
          const timeRow = document.createElement("tr");
          const timeLabelCell = document.createElement("td");
          timeLabelCell.textContent = "Time";
          const timeValueCell = document.createElement("td");
          timeValueCell.textContent = eventDetails.time;
          timeRow.appendChild(timeLabelCell);
          timeRow.appendChild(timeValueCell);
          tbody.appendChild(timeRow);
        }

        if (tbody.children.length > 0) {
          const table = document.createElement("table");
          table.classList.add("event-confirmation-table");
          table.setAttribute("border", "1");
          table.setAttribute("cellpadding", "1");
          table.setAttribute("cellspacing", "1");
          table.style.width = "100%";
          table.appendChild(tbody);
          confirmationDetails.appendChild(table);
        }

        eventSummaryBlock.appendChild(confirmationDetails);
        insertLocation.insertAdjacentElement("afterend", eventSummaryBlock);
      } else {
        this.logger.warn("Could not find insert location element to insert event summary block after.");
      }
    } else {
      this.logger.warn("No event summary data found in localStorage to display on thank you page.");
    }
  }

  private formatAllAmounts() {
    document.querySelectorAll(".en__ticket__price").forEach((el) => {
      const amount = el.textContent?.trim() || "";
      const currencyCode = el.parentElement?.querySelector(".en__ticket__currency")?.textContent?.trim() || "";
      const parsed = parseFloat(amount.replace(/[^0-9.\-]/g, ""));
      if (!isNaN(parsed)) {
        el.textContent = new Intl.NumberFormat(navigator.language, { style: "currency", currency: currencyCode || "USD" }).format(parsed);
      }
    });
    document.querySelectorAll(".en__orderSummary__data--cost").forEach((el) => {
      const item = el.textContent?.trim().split(" ") || "";
      const amount = item[0] || "";
      let currencyCode = "";
      if (item.length === 2) {
        currencyCode = item[1];
      }
      const parsed = parseFloat(amount.replace(/[^0-9.\-]/g, ""));
      if (!isNaN(parsed)) {
        el.textContent = new Intl.NumberFormat(navigator.language, { style: "currency", currency: currencyCode || "USD" }).format(parsed);
      }
    });
  }

  private updateTotalAmount() {
    const additionalInput = document.querySelector(".en__additional__input") as HTMLInputElement | null;
    let totalAmount = 0;
    let currencySymbol = "";
    const lineItems: EventLineItem[] = [];

    document.querySelectorAll(".en__ticket__quantity").forEach((el) => {
      const quantity = Number((el as HTMLInputElement).value);
      const row = el.parentElement?.parentElement?.parentElement;
      if (row) {
        const price = Number(row.querySelector(".en__ticket__price")?.textContent?.replace(/[^0-9.]/g, "")) || 0;
        const currency = row.querySelector(".en__ticket__currency")?.textContent?.trim() || "USD";
        lineItems.push({
          name: row.querySelector(".en__ticket__type")?.textContent?.trim() || "Ticket",
          quantity,
          price,
          currency,
        });
        currencySymbol = currency;
        totalAmount += price * quantity;
      }
    });

    if (additionalInput) {
      const additionalAmount = !isNaN(Number(additionalInput.value)) ? Number(additionalInput.value) : 0;
      totalAmount += additionalAmount;
      lineItems.push({
        name: "Additional Donation",
        quantity: 1,
        price: additionalAmount,
        currency: currencySymbol || "USD",
      });
    }

    this.logger.log(`Calculated total amount: ${totalAmount} ${currencySymbol}`);

    document.querySelectorAll(".live-giving-amount").forEach((el) => {
      el.textContent = new Intl.NumberFormat(navigator.language, { style: "currency", currency: currencySymbol || "USD" }).format(totalAmount);
    });

    localStorage.setItem("billingInfo", JSON.stringify({
      totalAmount,
      currency: currencySymbol || "USD",
      lineItems,
    }));
  }
}