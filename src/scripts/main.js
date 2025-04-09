import { setDonationDataSessionStorage } from "./tracking";

const tippy = require("tippy.js").default;

export const customScript = function (
  App,
  DonationFrequency,
  DonationAmount,
  EnForm
) {
  // console.log("ENGrid client scripts are executing");

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
        if (advRow) {
          advRow.append(floatingButton);
        }
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
  const texts = {
    en: {
      emailFieldNotice:
        "You'll receive email updates from The Nature Conservancy. You can unsubscribe at any time.",
      phoneNumberNotice:
        "By sharing your phone number, you give The Nature Conservancy permission to contact you with updates via phone and text.",
      cvvTooltipLabel: "What is a CVV number?",
      cvvTooltip:
        "The CVV is a 3- or 4-digit code printed on your credit card. It's a fraud-prevention measure designed to make it harder to use info stolen in a data breach.",
      bankNumberTooltipLabel: "What is this?",
      bankNumberTooltip:
        "Your routing number is the 9-digit number at the bottom left of your check.",
    },
    es: {
      emailFieldNotice:
        "Recibirás noticias de TNC periódicamente. Puedes cancelar tu suscripción en cualquier momento.",
      phoneNumberNotice:
        "Al compartir tu número telefónico, autorizas a TNC a contactarte y enviarte noticias por teléfono o por mensaje de texto.",
      cvvTooltipLabel: "¿Qué es un CVV?",
      cvvTooltip:
        "El CVV es un código de 3 ó 4 dígitos impreso en su tarjeta de crédito. Es una medida de prevención de fraude diseñada para dificultar el uso de información robada en filtraciones de datos.",
      bankNumberTooltipLabel: "¿Qué es esto?",
      bankNumberTooltip:
        "Su número de ruta es el número de 9 dígitos que aparece en la parte inferior izquierda de su cheque.",
    },
  };

  const text = texts[window.pageJson.locale.slice(0, 2)] ?? texts.en;

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

  const emailField = document.querySelector('[name="supporter.emailAddress"]');
  if (emailField && emailField.type !== "hidden") {
    // Add a notice to the email field
    App.addHtml(
      `<div class="en__field__notice">${text.emailFieldNotice}</div>`,
      '[name="supporter.emailAddress"]',
      "after"
    );
  }

  // Add a notice to the phone number field
  App.addHtml(
    `<div class="en__field__notice">${text.phoneNumberNotice}</div>`,
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
    text.cvvTooltipLabel,
    text.cvvTooltip
  );

  // Add a tooltip for the bank routing number
  addTooltip(
    document.querySelector(".en__field--bankRoutingNumber > label"),
    "bankNumber",
    text.bankNumberTooltipLabel,
    text.bankNumberTooltip
  );

  // Add a tooltip for Title
  addTooltip(
    document.querySelector(".en__field--title > label"),
    "title",
    "Why do you ask for this?",
    "Many of our online actions link up with public officials' web mail forms in order to deliver your message on your behalf. Many of these public officials' forms require the Mr./Mrs./Miss field and, unfortunately, we do not have control over which of these titles are presented as options. We must adhere to what the officials are using in order for your message to be delivered."
  );

  /**
   * Set the visibility of the premium field based on the donation frequency and amount
   * Visibility is set by adding/removing the "engrid-premium-donation" data attr on the body
   * @param {string} frequency
   * @param {number} amount
   */
  function setPremiumVisibility(frequency, amount) {
    const monthlyPremiumMinimum =
      window?.donationSettings?.monthlyPremiumMinimum;
    const onetimePremiumMinimum =
      window?.donationSettings?.onetimePremiumMinimum;

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
  const amt = DonationAmount?.getInstance();
  if (freq && amt) {
    freq.onFrequencyChange.subscribe((frequency) => {
      setPremiumVisibility(frequency, amt.amount);
    });
    amt.onAmountChange.subscribe((amount) => {
      setPremiumVisibility(freq.frequency, amount);
    });
  }

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

  // Make body-banner and images with attribution attribution clickable
  const bbTippy = document.querySelectorAll(
    ".body-banner figattribution, img.img-with-attribution[alt] + figattribution"
  );

  if (bbTippy) {
    bbTippy.forEach((el) => {
      const tippyInstance = el?._tippy;
      if (tippyInstance) {
        tippyInstance.setProps({
          arrow: false,
          trigger: "click",
        });
      }
    });
  }

  // Add data-thank-you attribute to body of final page
  if (
    pageJson &&
    pageJson.pageNumber === pageJson.pageCount &&
    pageJson.pageCount > 1
  ) {
    App.setBodyData("thank-you", "true");
  } else {
    App.setBodyData("thank-you", "false");
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

  ////////////////////////////////////////////
  // Spanish translation tweaks

  // Translate recurring status
  const recurringStatus = document.querySelector(".js-recurring-status");
  if (recurringStatus) {
    if (
      window.navigator.language === "es-MX" ||
      window.location.href.indexOf("locale=es-MX") > -1 ||
      pageJson.locale === "es-MX"
    ) {
      console.log(recurringStatus.textContent);
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

  if (window?.pageJson?.locale === "es-MX") {
    const donationAmountField = document.querySelector(
      ".en__field--donationAmt"
    );

    if (donationAmountField) {
      donationAmountField.style.setProperty(
        "--give-monthly-donation-amount-appended-label",
        '"/MES"'
      );
    }
  }

  // END Spanish translation tweaks

  ////////////////////////////////////////////
  // END ENGRID TRANSITION SCRIPTS
  ////////////////////////////////////////////

  /*
   * Conditional content via URL parameters
   * js-zcc--param--value
   * ?crid=1234
   * Will reveal all elements with class js-zcc--crid--1234
   */
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.forEach((value, param) => {
    value = value.replace(/[^_a-zA-Z0-9-]/g, "_").toLowerCase();
    param = param.replace(/[^_a-zA-Z0-9-]/g, "_").toLowerCase();

    const conditionalElements = document.querySelectorAll(
      `.js-zcc--${param}--${value}`
    );

    if (conditionalElements.length > 0) {
      conditionalElements.forEach((el) => {
        el.classList.remove(`js-zcc--${param}--${value}`);
      });
    } else {
      // If there no elements with the specified value, reveal all default elements for that parameter.
      const defaultElements = document.querySelectorAll(
        `[class="js-zcc--${param}--default"]`
      );
      defaultElements.forEach((el) => {
        el.classList.remove(`js-zcc--${param}--default`);
      });
    }
  });
  // If there is no URL parameter, reveal all elements with class js-zcc--paramName--default class
  const conditionalElements = document.querySelectorAll(`[class*="js-zcc--"]`);
  conditionalElements.forEach((el) => {
    const className = [...el.classList].find(
      (className) =>
        className.startsWith("js-zcc--") && className.endsWith("--default")
    );
    if (!className) return;
    const paramName = className.split("--")[1];
    if (!urlParams.has(paramName)) {
      el.classList.remove(className);
    }
  });
  // If there are any extra banner image elements being controlled by the URL parameters,
  // we will remove them from the page (extra banner images inside body-banner will prevent the image showing)
  const extraBannerImages = document.querySelectorAll(
    ".body-banner img[class*='js-zcc--']"
  );
  extraBannerImages.forEach((img) => {
    img?.closest(".en__component--imageblock")?.remove();
  });

  /*
   * Lock gift designation field when a specific value is passed in the URL
   * and we are using the gift designation form block
   */
  const giftDesignationField = document.querySelector(
    ".engrid-gift-designation #en__field_supporter_appealCode"
  );
  const appealCode = urlParams.get("supporter.appealCode");
  if (giftDesignationField && appealCode) {
    const giftDesignationNeededMostCheckbox = document.querySelector(
      "#en__field_supporter_questions_8785940"
    );
    const giftDesignationChooseCheckbox = document.querySelector(
      "#en__field_supporter_questions_8785941"
    );
    if (giftDesignationNeededMostCheckbox && giftDesignationChooseCheckbox) {
      giftDesignationChooseCheckbox.addEventListener("change", () => {
        if (giftDesignationChooseCheckbox.checked) {
          giftDesignationField.value = appealCode;
        }
      });
    }
    // if the gift designation field is a select field,
    // and it doesnt have the url param value in its options, make that option and select it
    if (giftDesignationField.tagName === "SELECT") {
      let option = giftDesignationField.querySelector(
        `option[value="${appealCode}"]`
      );
      if (!option) {
        option = document.createElement("option");
        option.value = appealCode;
        option.text = appealCode;
        giftDesignationField.appendChild(option);
        giftDesignationField.value = appealCode;
        giftDesignationChooseCheckbox.checked = true;
      }
      giftDesignationField.closest(".en__field")?.classList.add("hide");
      const label = document.querySelector(
        "[for='en__field_supporter_questions_8785941']"
      );
      if (label) {
        label.innerHTML = `I would like to designate my gift to ${option.innerText}.`;
      }
    }
  }

  /*
   * Make image selects on surveys into checkboxes
   * "engrid-checkboxes" needs to be somewhere inside the "reference name" field of the question
   */
  const imageSelectQuestions = document.querySelectorAll(
    ".en__field--imgselect[class*='engrid-checkboxes']"
  );

  imageSelectQuestions.forEach((question, i) => {
    const inputs = question.querySelectorAll("input[type='radio']");
    if (inputs.length === 0) return;

    question.className.split(" ").forEach((className) => {
      // Remove the en__field--numbers class to prevent validation
      if (className.match(/en__field--\d+/)) {
        question.classList.remove(className);
      }
    });

    const hiddenInput = App.createHiddenInput(inputs[0].name);
    question.appendChild(hiddenInput);

    inputs.forEach((input) => {
      input.type = "checkbox";
      input.name = `${input.name}-${i}`;

      input.addEventListener("change", () => {
        const checkedValues = [];
        inputs.forEach((input) => {
          if (input.checked) {
            checkedValues.push(input.value);
          }
          hiddenInput.value = checkedValues.join(",");
        });
      });
    });
  });

  // Select donation amount based on URL parameter
  const donationIndex = new URLSearchParams(window.location.search).get(
    "donationIndex"
  );
  if (donationIndex) {
    const donationAmounts = document.querySelectorAll(
      'input[name="transaction.donationAmt"]'
    );
    if (donationAmounts[donationIndex]) {
      amt.setAmount(donationAmounts[donationIndex].value);
    }
  }

  const bannerImageSrc = document.querySelector(".body-banner img")?.src;
  const bodyBanner = document.querySelector(".body-banner");
  if (bodyBanner && bannerImageSrc) {
    bodyBanner.style.setProperty(
      "--banner-image-src",
      `url(${bannerImageSrc})`
    );
  }

  // Set the donation amount in sessionStorage when the mobile wallet iframe is focused
  const mobileWalletContainer = document.getElementById("en__digitalWallet");
  if (mobileWalletContainer) {
    const dataListener = () => {
      const iframe = mobileWalletContainer.getElementsByTagName("iframe");
      if (document.activeElement === iframe[0]) {
        setDonationDataSessionStorage(App, DonationAmount);
        window.removeEventListener("blur", dataListener);
      }
    };

    window.addEventListener("blur", dataListener);
  }

  // Accordion functionality
  const accordion = document.querySelectorAll(".accordion-header");
  accordion.forEach((button) => {
    button.addEventListener("click", function () {
      const button = this.querySelector(".accordion-button");
      button.classList.toggle("collapsed");
      const panel = this.nextElementSibling;
      panel.classList.toggle("show");

      document.querySelectorAll(".accordion-item").forEach((el) => {
        if (el.contains(button)) return;

        el.querySelector(".accordion-button").classList.add("collapsed");
        el.querySelector(".accordion-collapse").classList.remove("show");
      });
    });
  });

  const observerConfig = {
    attributes: true,
    attributeFilter: ["placeholder", "aria-required"],
    subtree: true,
  };

  const updatePlaceholder = (field) => {
    if (field.name === "transaction.donationAmt.other") {
      return; // Exclude specific field
    }

    const isFieldRequired =
      field.required ||
      field.getAttribute("aria-required") === "true" ||
      field.closest(".en__component--formblock.i-required");
    const placeholder = field.getAttribute("placeholder");

    if (placeholder) {
      if (isFieldRequired && !placeholder.endsWith("*")) {
        field.setAttribute("placeholder", `${placeholder}*`);
      } else if (!isFieldRequired && placeholder.endsWith("*")) {
        field.setAttribute("placeholder", placeholder.slice(0, -1));
      }
    }
  };

  // Set specific placeholders
  const creditCardField = document.querySelector(
    'input[name="supporter.creditCardHolderName"]'
  );
  if (creditCardField) {
    creditCardField.setAttribute("placeholder", "Card Holder Name");
  }

  const accountHolderField = document.querySelector(
    'input[name="supporter.NOT_TAGGED_79"]'
  );
  if (accountHolderField) {
    accountHolderField.setAttribute("placeholder", "Account Holder's Name");
  }

  // Update required fields
  const fields = document.querySelectorAll(
    "input[placeholder], textarea[placeholder]"
  );
  fields.forEach((field) => {
    updatePlaceholder(field);

    // Observe placeholder and aria-required changes
    const observer = new MutationObserver(() => updatePlaceholder(field));
    observer.observe(field, observerConfig);
  });

  // Add placeholder to the Mobile Phone Field
  let enFieldMobilePhone = document.querySelectorAll(
    "input#en__field_supporter_phoneNumber2"
  )[0];
  if (enFieldMobilePhone) {
    enFieldMobilePhone.placeholder = "Mobile / Phone (Optional)";
  }

  // Function to update placeholders dynamically
  function updatePlaceholders() {
    const donationFields = document.querySelectorAll(
      ".en__field--donationAmt .en__field__item"
    );

    donationFields.forEach((field, index) => {
      const input = field.querySelector(
        "input[name='transaction.donationAmt.other']"
      );

      if (input) {
        const placeholder =
          index === 4 || index === 7 ? "Enter Other Amount" : "Other";

        // Set initial placeholder
        input.placeholder = placeholder;

        // Use focusin to clear placeholder
        input.addEventListener("focusin", function () {
          this.placeholder = ""; // Always clear placeholder on focus
        });

        // Use focusout to restore placeholder only if value and visual content are empty
        input.addEventListener("focusout", function () {
          if (!this.value && isVisuallyEmpty(this)) {
            this.placeholder = placeholder; // Restore only when value and pseudo-content are empty
          }
        });
      }
    });
  }

  // Helper function to check if input is visually empty
  function isVisuallyEmpty(input) {
    // Check if the ::before pseudo-element has visible content
    const beforeContent = window
      .getComputedStyle(input, "::before")
      .getPropertyValue("content");
    return (
      beforeContent === "none" ||
      beforeContent === '""' ||
      beforeContent.trim() === ""
    ); // Adjust based on your styles
  }

  // Set up MutationObserver (same as before)
  const targetNode = document.querySelector(".en__field--donationAmt");
  if (targetNode) {
    const observer = new MutationObserver(updatePlaceholders);

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });

    updatePlaceholders();
  }

  // Function to handle mobile phone number opt-in checkbox
  // function setupPhoneOptInCheckbox() {
  //   // console.log("Setting up mobile phone opt-in checkbox functionality");
  //   const mobilePhoneInput = document.querySelector(
  //     'input[name="supporter.phoneNumber2"]'
  //   );
  //   const optInCheckbox = document.querySelector(
  //     'input[name="supporter.questions.829861"]'
  //   );

  //   // console.log("Mobile phone input found:", mobilePhoneInput);
  //   // console.log("Mobile opt-in checkbox found:", optInCheckbox);

  //   if (mobilePhoneInput && optInCheckbox) {
  //     // Initial check when page loads
  //     if (mobilePhoneInput.value && mobilePhoneInput.value.trim() !== "") {
  //       // console.log("Initial mobile phone value exists, checking opt-in box");
  //       optInCheckbox.checked = true;
  //     } else {
  //       // console.log("No initial mobile phone value, unchecking opt-in box");
  //       optInCheckbox.checked = false;
  //     }

  //     // Add event listeners for input changes
  //     mobilePhoneInput.addEventListener("input", function () {
  //       // console.log("Mobile phone input changed:", this.value);
  //       if (this.value && this.value.trim() !== "") {
  //         // console.log("Setting mobile opt-in checkbox to checked");
  //         optInCheckbox.checked = true;
  //       } else {
  //         // console.log("Setting mobile opt-in checkbox to unchecked");
  //         optInCheckbox.checked = false;
  //       }
  //     });

  //     // Also listen for change events (for autofill, etc.)
  //     mobilePhoneInput.addEventListener("change", function () {
  //       // console.log("Mobile phone input change event:", this.value);
  //       if (this.value && this.value.trim() !== "") {
  //         // console.log(
  //         //   "Setting mobile opt-in checkbox to checked (from change event)"
  //         // );
  //         optInCheckbox.checked = true;
  //       } else {
  //         // console.log(
  //         //   "Setting mobile opt-in checkbox to unchecked (from change event)"
  //         // );
  //         optInCheckbox.checked = false;
  //       }
  //     });
  //   } else {
  //     // console.log("Could not find mobile phone input or opt-in checkbox");
  //   }
  // }

  // // Call the function to set up the mobile phone opt-in checkbox behavior only for multistep forms
  // // console.log("Checking if multistep form before initializing phone opt-in");
  // if (document.body.getAttribute("data-engrid-subtheme") === "multistep") {
  //   // console.log(
  //   //   "Multistep form detected, initializing mobile phone opt-in checkbox setup"
  //   // );
  //   setupPhoneOptInCheckbox();
  // }
};
