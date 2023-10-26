const tippy = require("tippy.js").default;

export const customScript = function (App, DonationFrequency, DonationAmount) {
  console.log("ENGrid client scripts are executing");
  // Add your client scripts here
  var checkForServerError = document.querySelector(".en__errorList *");
  if (checkForServerError) {
    console.log("Has server error!");
  } else {
    console.log("Does not have a server error!");

    // Check if the first field is in the viewport
    let firstElement = document.querySelector(".en__component--formblock");
    if (firstElement) {
      firstElement.id = "firstElement";
      let bounding = firstElement.getBoundingClientRect();

      if (
        bounding.top >= 0 &&
        bounding.left >= 0 &&
        bounding.right <= window.innerWidth &&
        bounding.bottom <= window.innerHeight
      ) {
        console.log("First field is in the viewport!");
      } else {
        console.log("First field is NOT in the viewport! Add hover button");
        const floatingButton = document.createElement("div");
        const floatingButtonLabelElement = document.querySelector(
          ".floating-button-label"
        );
        const floatingButtonLabel =
          floatingButtonLabelElement?.innerText ?? "Take Action";
        floatingButton.id = "floating-button";
        floatingButton.className = "arrow";
        floatingButton.innerHTML = `<div class='en__submit'><a class='pseduo__en__submit_button' href='#firstElement'>${floatingButtonLabel}</a></div>`;
        const advRow = document.querySelector(".en__component--advrow");
        advRow.append(floatingButton);
        floatingButton
          .querySelector(".pseduo__en__submit_button")
          .addEventListener("click", function (e) {
            e.preventDefault();
            document.querySelector("#firstElement").scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          });
        document.addEventListener("scroll", function (e) {
          const button = document.querySelector("#floating-button");
          if (window.scrollY < 100) {
            button.classList.add("show");
          } else {
            button.classList.remove("show");
          }
        });
        window.setTimeout(() => {
          if (window.scrollY < 100) {
            floatingButton.classList.add("show");
          }
        }, 200);
      }
    }
  }

  ////////////////////////////////////////////
  // START ENGRID TRANSITION SCRIPTS
  ////////////////////////////////////////////

  // Position monthly upsell after the recurring frequency field
  let inlineMonthlyUpsell = document.querySelector(
    ".move-after--transaction-recurrfreq"
  );
  let recurrFrequencyField = document.querySelector(".en__field--recurrfreq");
  if (inlineMonthlyUpsell && recurrFrequencyField) {
    recurrFrequencyField.insertAdjacentElement(
      "beforeend",
      inlineMonthlyUpsell
    );
  }

  // Add a notice to the email field
  App.addHtml(
    '<div class="en__field__notice">You\'ll receive email updates from The Nature Conservancy. You can unsubscribe at any time.</div>',
    '[name="supporter.emailAddress"]',
    "after"
  );

  // Add a notice to the phone number field
  App.addHtml(
    '<div class="en__field__notice">By sharing your phone number, you give The Nature Conservancy permission to contact you with updates via phone and text.</div>',
    '[name="supporter.phoneNumber2"]',
    "after"
  );

  /**
   * Add a Tippy tooltip to a field
   * @param {HTMLElement} labelElement
   * @param {string} fieldName
   * @param {string} labelText
   * @param {string} tooltipText
   */
  function addTooltip(labelElement, fieldName, labelText, tooltipText) {
    if (!labelElement) {
      return;
    }
    let link = document.createElement("a");
    link.href = "#";
    link.id = fieldName + "-tooltip";
    link.className = fieldName + "-tooltip tippy-label";
    link.tabIndex = -1;
    link.innerText = labelText;
    link.addEventListener("click", (e) => e.preventDefault());
    labelElement.insertAdjacentElement("afterend", link);

    let wrapper = document.createElement("span");
    wrapper.className = "label-wrapper";
    labelElement.parentNode.insertBefore(wrapper, labelElement);
    wrapper.appendChild(labelElement);
    wrapper.appendChild(link);

    tippy("#" + fieldName + "-tooltip", {
      content: tooltipText,
      theme: "light-border",
    });
  }

  // Add a tooltip for the CVV number
  addTooltip(
    document.querySelector(".en__field--ccvv > label"),
    "cvv",
    "What is a CVV number?",
    "The CVV is a 3- or 4-digit code printed on your credit card. It's a fraud-prevention measure designed to make it harder to use info stolen in a data breach."
  );

  // Add a tooltip for the bank routing number
  addTooltip(
    document.querySelector(".en__field--bankRoutingNumber > label"),
    "bankNumber",
    "What is this?",
    "Your routing number is the 9-digit number at the bottom left of your check."
  );

  /**
   * Set the visibility of the premium field based on the donation frequency and amount
   * Visibility is set by adding/removing the "engrid-premium-donation" data attr on the body
   * @param {string} frequency
   * @param {number} amount
   */
  function setPremiumVisibility(frequency, amount) {
    const monthlyPremiumMinimum = window.donationSettings.monthlyPremiumMinimum;
    const onetimePremiumMinimum = window.donationSettings.onetimePremiumMinimum;

    if (!monthlyPremiumMinimum || !onetimePremiumMinimum) {
      return;
    }

    const monthlyPremiumField = App.getField("supporter.questions.1362488");
    const premiumVisibleField = App.getField("supporter.questions.1366068");

    if (!monthlyPremiumField || !premiumVisibleField) {
      return;
    }

    if (frequency === "monthly" && amount >= monthlyPremiumMinimum) {
      App.setBodyData("premium-donation", "active");
      monthlyPremiumField.checked = true;
      premiumVisibleField.checked = true;
      App.enParseDependencies();
    } else if (
      (frequency === "onetime" || frequency === "annual") &&
      amount >= onetimePremiumMinimum
    ) {
      App.setBodyData("premium-donation", "active");
      monthlyPremiumField.checked = false;
      premiumVisibleField.checked = true;
      App.enParseDependencies();
    } else {
      App.setBodyData("premium-donation", "inactive");
      monthlyPremiumField.checked = false;
      premiumVisibleField.checked = false;
      App.enParseDependencies();
    }
  }

  // Listen for changes to the donation frequency and amount
  const freq = DonationFrequency.getInstance();
  const amt = DonationAmount.getInstance();
  freq.onFrequencyChange.subscribe((frequency) => {
    setPremiumVisibility(frequency, amt.amount);
  });
  amt.onAmountChange.subscribe((amount) => {
    setPremiumVisibility(freq.frequency, amount);
  });

  // Move Premium donation elements into their container
  let premiumDonationEls = document.querySelectorAll(
    ".move-into--engrid-premium-container"
  );
  let premiumDonationContainer = document.querySelector(
    ".engrid-premium-container"
  );
  if (premiumDonationEls.length > 0 && premiumDonationContainer) {
    premiumDonationEls.forEach((el) => {
      premiumDonationContainer.appendChild(el);
    });
  }

  // Make body-banner attribution clickable
  const bbTippy = document.querySelector(".body-banner figattribution")?._tippy;

  if (bbTippy) {
    bbTippy.setProps({
      arrow: false,
      trigger: "click",
    });
  }

  // Add data-thank-you attribute to body of final page
  if (
    pageJson &&
    pageJson.pageNumber === pageJson.pageCount &&
    pageJson.pageCount > 1
  ) {
    App.setBodyData("thank-you", "true");
  }

  // Auto renew
  const autoRenew = document.getElementById("en__field_auto_renew");
  if (autoRenew) {
    const annualFrequencyOption = document.querySelector(
      'input[name="transaction.recurrfreq"][value="ANNUAL"]'
    );
    const extRef2Input = document.querySelector('[name="en_txn2"]');

    if (!annualFrequencyOption || !extRef2Input) {
      // if recurring frequency option for annual is not found, we remove the auto renew checkbox and stop here
      console.error(
        "ENgrid: Annual frequency option or external reference field not found. Removing Auto Renew checkbox to prevent failed donations."
      );
      autoRenew.closest(".en__field--auto-renew").remove();
    } else {
      annualFrequencyOption.parentElement.classList.add("hide");
      App.setBodyData("auto-renew-on-page", "true");
      App.setBodyData("auto-renew-active", autoRenew.checked.toString());
      extRef2Input.value = autoRenew.checked ? "auto_renew" : "";

      const freq = DonationFrequency.getInstance();
      freq.onFrequencyChange.subscribe((frequency) => {
        if (frequency === "annual") {
          App.setBodyData("auto-renew-active", "true");
          extRef2Input.value = "auto_renew";
        } else {
          App.setBodyData("auto-renew-active", "false");
          extRef2Input.value = "";
        }
      });
    }
  }

  // Translate recurring status
  const recurringStatus = document.querySelector(".js-recurring-status");
  if (recurringStatus) {
    if (
      window.navigator.language === "es-MX" ||
      window.location.href.indexOf("locale=es-MX") > -1 ||
      pageJson.locale === "es-MX"
    ) {
      switch (recurringStatus.textContent) {
        case "MONTHLY":
          recurringStatus.textContent = "Mensual";
          break;
        case "ANNUAL":
          recurringStatus.textContent = "Anual";
          break;
        default:
          recurringStatus.textContent = "Una vez";
      }
    } else {
      switch (recurringStatus.textContent) {
        case "MONTHLY":
          recurringStatus.textContent = "Monthly";
          break;
        case "ANNUAL":
          recurringStatus.textContent = "Annual";
          break;
        default:
          recurringStatus.textContent = "One-time";
      }
    }
  }

  ////////////////////////////////////////////
  // END ENGRID TRANSITION SCRIPTS
  ////////////////////////////////////////////
};
