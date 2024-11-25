/**
 * @typedef {Object} Window
 * @property {Object} utag
 * @property {Object} utag_data
 * @property {String} utag_data.page_name
 * @property {Object} pageJson
 * @property {String} pageJson.pageType
 */

export function trackEvent(eventName, eventData) {
  if (typeof utag !== "undefined") {
    utag.link({
      event_name: eventName,
      ...eventData,
    });
  } else {
    window.utagQueue = window.utagQueue || [];
    window.utagQueue.push({
      event_name: eventName,
      ...eventData,
    });
    const tealiumScript = document.querySelector(
      'script[src*="//tags.tiqcdn.com/utag/tnc/global/prod/utag.js"]'
    );
    if (tealiumScript) {
      tealiumScript.onload = () => {
        window.utagQueue.forEach((event) => {
          utag.link(event);
        });
        window.utagQueue = [];
      };
    }
  }
}

export function trackFormSubmit(App, DonationAmount) {
  //Donation page submits
  if (App.getPageType() === "DONATION" && App.getPageNumber() === 1) {
    const donationData = {};
    donationData.productId = utag_data.page_name.slice(0, -2);
    donationData.campaignId = pageJson.campaignId;
    donationData.campaignPageId = App.getPageID();
    donationData.state = App.getFieldValue("supporter.region");
    donationData.zipCode = App.getFieldValue("supporter.postcode");
    donationData.emailAddress = App.getFieldValue("supporter.emailAddress");
    donationData.originalDonationAmount = DonationAmount.getInstance().amount;
    donationData.extraAmount = 0;
    // New donationData fields for Google Ads Enhanced Conversions
    donationData.firstName = App.getFieldValue("supporter.firstName");
    donationData.lastName = App.getFieldValue("supporter.lastName");
    donationData.address1 = App.getFieldValue("supporter.address1");
    donationData.city = App.getFieldValue("supporter.city");
    donationData.country = App.getFieldValue("supporter.country");
    donationData.phoneNumber = App.getFieldValue("supporter.phoneNumber2");

    /** @type {HTMLInputElement} */
    //If fee cover is checked, set extra amount to 3% of donation amount and subtract from original donation amount
    const feeCoverCheckbox = App.getField("transaction.feeCover");
    if (feeCoverCheckbox && feeCoverCheckbox.checked) {
      donationData.extraAmount = (
        DonationAmount.getInstance().amount * 0.03
      ).toFixed(2);
      donationData.originalDonationAmount =
        donationData.originalDonationAmount - donationData.extraAmount;
    }

    const sendEcardCheckbox = document.getElementById(
      "en__field_embedded-ecard"
    );
    if (sendEcardCheckbox && sendEcardCheckbox.checked) {
      donationData.ecardSelected = "true";
    }

    sessionStorage.setItem("donationData", JSON.stringify(donationData));
  }

  //Mobile phone data (for "F32 - Real Time SMS Push" script - opts user into SMS via API)
  /** @type {HTMLInputElement} */
  const mobilePhoneNumber = App.getField("supporter.phoneNumber2");
  if (mobilePhoneNumber) {
    const mobilePhoneData = {};
    mobilePhoneData.phoneNumber = mobilePhoneNumber.value;
    /** @type {HTMLInputElement} */
    const mobilePhoneOptIn =
      App.getField("supporter.questions.848527") ||
      App.getField("supporter.questions.1952175");
    if (mobilePhoneOptIn && mobilePhoneOptIn.checked) {
      mobilePhoneData.optIn = "Y";
    }
    sessionStorage.setItem("mobilePhoneData", JSON.stringify(mobilePhoneData));
  }

  //Track ETT, petition, survey and data capture submits
  if (["ADVOCACY", "EMAILTOTARGET", "SURVEY"].includes(App.getPageType())) {
    if (App.getFieldValue("supporter.emailAddress") === "") {
      return;
    }

    let utagData = {};
    utagData.form_type = pageJson.pageType;
    utagData.form_name = utag_data.page_name.slice(0, -2);
    utagData.action_id = utag_data.form_name;
    utagData.action_type = pageJson.pageType;
    utagData.zip_code = App.getFieldValue("supporter.postcode");
    utagData.email_signup_location = pageJson.pageType;

    // New utag variables fields for Google Ads Enhanced Conversions for ETT & PET
    utagData.const_first = App.getFieldValue("supporter.firstName");
    utagData.const_last = App.getFieldValue("supporter.lastName");
    utagData.const_address = App.getFieldValue("supporter.address1");
    utagData.const_city = App.getFieldValue("supporter.city");
    utagData.customer_state = App.getFieldValue("supporter.region");
    utagData.customer_postal_code = App.getFieldValue("supporter.postcode");
    utagData.customer_country = App.getFieldValue("supporter.country");
    utagData.const_phone = App.getFieldValue("supporter.phoneNumber2");

    const eventName = getSubmitEventName(App);
    if (
      eventName === "frm_emt_txt_submit" ||
      eventName === "frm_emt_emo_txt_submit"
    ) {
      utagData.text_signup_location = pageJson.pageType;
    }

    trackEvent(eventName, utagData);
  }
}

function getSubmitEventName(App) {
  const isOptedInToPhone = [
    "supporter.questions.848528",
    "supporter.questions.1952175",
    "supporter.questions.848527",
  ].some((field) => {
    /** @type {HTMLInputElement} */
    const el = App.getField(field);
    return (
      el && el.checked && App.getFieldValue("supporter.phoneNumber2") !== ""
    );
  });

  const isOptedInToEmail = [
    "supporter.questions.848518",
    "supporter.questions.848520",
    "supporter.questions.848521",
    "supporter.questions.848522",
    "supporter.questions.848523",
  ].some((field) => {
    /** @type {HTMLInputElement} */
    const el = App.getField(field);
    return el && el.checked;
  });

  if (isOptedInToEmail && isOptedInToPhone) {
    return "frm_emt_emo_txt_submit";
  }
  if (isOptedInToPhone) {
    return "frm_emt_txt_submit";
  }
  if (isOptedInToEmail) {
    return "frm_emt_emo_submit";
  }
  return "frm_emt_submit";
}

export function trackFormErrors() {
  let invalidFields = "";
  let errors = "";

  // Gather invalid fields and error messages
  document.querySelectorAll(".en__field--validationFailed").forEach((el) => {
    if (el.querySelector(".en__field__error")) {
      invalidFields += `${el
        .querySelector(".en__field__input")
        .getAttribute("name")}|`;
      errors += `${el.querySelector(".en__field__error").textContent}|`;
    }
  });

  // Fire tracking if errors were found
  if (invalidFields !== "") {
    trackEvent("form_error", {
      form_field_error_field: invalidFields.slice(0, -1),
      form_field_error_value: errors.slice(0, -1),
      form_name: utag_data.page_name.slice(0, -2),
      form_type: pageJson.pageType,
    });
  }
}

export function trackProcessingErrors(App) {
  const errorList = document.querySelector(".en__errorList");

  if (errorList && errorList.textContent.trim() !== "") {
    trackEvent("form_error", {
      form_field_error_field: "payment error",
      form_field_error_value: "payment error",
      payment_type: App.getPaymentType(),
      form_name: utag_data.page_name.slice(0, -2),
      form_type: pageJson.pageType,
    });
  }
}

export function trackUrlParams() {
  const params = new URLSearchParams(location.search);
  const trackers = [
    "src",
    "vid",
    "vid2",
    "en_txn1",
    "en_txn2",
    "en_txn3",
    "en_txn4",
    "en_txn5",
    "en_txn7",
    "en_txn8",
    "en_txn9",
    "en_txn10",
  ];
  let visitData = sessionStorage.getItem("visitData")
    ? JSON.parse(sessionStorage.getItem("visitData"))
    : {};

  trackers.forEach((tracker) => {
    if (params.has(tracker)) {
      visitData[tracker] = params.get(tracker);
    }
  });

  sessionStorage.setItem("visitData", JSON.stringify(visitData));
}

export function trackUserInteractions() {
  // Track clicks on social share buttons
  document.querySelectorAll(".en__socialShare__image").forEach((el) => {
    el.addEventListener("click", (e) => {
      trackEvent("social_share", {
        social_share_id: `preserve.nature.org.share.${e.target.parentElement.dataset.enshare}`,
        social_share_platform: e.target.parentElement.dataset.enshare,
      });
    });
  });

  // Track clicks on footer links
  document.querySelectorAll(".main-page-footer a").forEach((el) => {
    el.addEventListener("click", (e) => {
      trackEvent("footer_nav_click", {
        nav_click_location: `preserve.nature.org.fnav.${e.target.textContent.toLowerCase()}`,
      });
    });
  });

  // Track en upsell modal opening
  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.firstChild && node.firstChild.id === "en__upsellModal") {
            //Track lightbox opened
            trackEvent("lightbox_impression", {
              lightbox_name: "sustainer upsell",
            });
            //Track if 'yes' is clicked on lightbox
            document
              .getElementById("en__upsellModal__yes")
              .addEventListener("click", () => {
                trackEvent("lightbox_click", {
                  lightbox_name: "sustainer upsell",
                });
              });
            observer.disconnect();
          }
        });
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}
