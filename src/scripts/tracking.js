import { gdcpFields } from "./gdcp/config/gdcp-fields";

// ---------------------------------------------------------------------------
// Opt-ins
// ---------------------------------------------------------------------------

// GDCP mirrors its visible consent checkboxes onto these EN opt-in
// questions, so reading them from the GDCP config keeps tracking in step
// with whichever questions are actually on the form.
/** @param {"email" | "mobile_phone"} channel */
function isOptedIn(channel) {
  const { optInFieldNames } = gdcpFields.find(
    (field) => field.channel === channel
  );
  return optInFieldNames.some((name) => {
    /** @type {HTMLInputElement | null} */
    const el = document.querySelector(`[name="${name}"]`);
    return !!el && el.checked;
  });
}

export function isOptedInToEmail() {
  return isOptedIn("email");
}

export function isOptedInToMobilePhone() {
  return isOptedIn("mobile_phone");
}

function hasMobilePhoneOptIn(App) {
  return (
    isOptedInToMobilePhone() &&
    App.getFieldValue("supporter.phoneNumber2") !== ""
  );
}

// Some forms use the home phone field as the mobile number.
function hasHomePhoneAsMobileOptIn(App) {
  /** @type {HTMLInputElement | null} */
  const homePhoneAsMobileOptIn = App.getField("supporter.questions.891102");
  return (
    !!homePhoneAsMobileOptIn &&
    homePhoneAsMobileOptIn.checked &&
    App.getFieldValue("supporter.phoneNumber") !== ""
  );
}

// ---------------------------------------------------------------------------
// Tealium
// ---------------------------------------------------------------------------

// Tealium maps each event_name to Adobe Analytics events (event5, event8…).
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

// Tealium (utag_data) isn't loaded on every page — notably the QCB
// data-capture iframes processed by the IframeQueue.
function isTealiumDataLoaded() {
  return typeof utag_data !== "undefined";
}

function getFormName() {
  return isTealiumDataLoaded() ? utag_data.page_name.slice(0, -2) : "";
}

// ---------------------------------------------------------------------------
// Session data read by the separate analytics.js script on later pages
// ---------------------------------------------------------------------------

export function setDonationDataSessionStorage(App, DonationAmount) {
  const donationData = {};
  donationData.productId = utag_data.page_name.slice(0, -2);
  donationData.campaignId = pageJson.campaignId;
  donationData.campaignPageId = App.getPageID();
  donationData.state = App.getFieldValue("supporter.region");
  donationData.zipCode = App.getFieldValue("supporter.postcode");
  donationData.emailAddress = App.getFieldValue("supporter.emailAddress");
  donationData.originalDonationAmount = DonationAmount.getInstance().amount;
  donationData.extraAmount = 0;
  donationData.firstName = App.getFieldValue("supporter.firstName");
  donationData.lastName = App.getFieldValue("supporter.lastName");
  donationData.address1 = App.getFieldValue("supporter.address1");
  donationData.city = App.getFieldValue("supporter.city");
  donationData.country = App.getFieldValue("supporter.country");
  donationData.phoneNumber = App.getFieldValue("supporter.phoneNumber2");
  donationData.isEmailOptInChecked = isOptedInToEmail();

  // Fee cover adds 3% on top, so report it separately from the gift amount.
  /** @type {HTMLInputElement} */
  const feeCoverCheckbox = App.getField("transaction.feeCover");
  if (feeCoverCheckbox && feeCoverCheckbox.checked) {
    donationData.extraAmount = (
      DonationAmount.getInstance().amount * 0.03
    ).toFixed(2);
    donationData.originalDonationAmount =
      donationData.originalDonationAmount - donationData.extraAmount;
  }

  const sendEcardCheckbox = document.getElementById("en__field_embedded-ecard");
  if (sendEcardCheckbox && sendEcardCheckbox.checked) {
    donationData.ecardSelected = "true";
  }

  sessionStorage.setItem("donationData", JSON.stringify(donationData));
}

// Also read by the "F32 - Real Time SMS Push" script, which opts the
// supporter into SMS via API.
function setMobilePhoneDataSessionStorage(App) {
  /** @type {HTMLInputElement} */
  const mobilePhoneNumber = App.getField("supporter.phoneNumber2");
  if (!mobilePhoneNumber) {
    return;
  }

  const mobilePhoneData = {};
  mobilePhoneData.phoneNumber = mobilePhoneNumber.value;
  /** @type {HTMLInputElement} */
  const mobilePhoneOptIn =
    App.getField("supporter.questions.848527") ||
    App.getField("supporter.questions.1952175") ||
    App.getField("supporter.questions.2268563");
  if (mobilePhoneOptIn && mobilePhoneOptIn.checked) {
    mobilePhoneData.optIn = "Y";
  }
  sessionStorage.setItem("mobilePhoneData", JSON.stringify(mobilePhoneData));
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

// ---------------------------------------------------------------------------
// Form submit tracking
// ---------------------------------------------------------------------------

export function trackFormSubmit(App, DonationAmount) {
  if (App.getPageType() === "DONATION" && App.getPageNumber() === 1) {
    setDonationDataSessionStorage(App, DonationAmount);
  }

  setMobilePhoneDataSessionStorage(App);

  if (["ADVOCACY", "EMAILTOTARGET", "SURVEY"].includes(App.getPageType())) {
    trackSignupFormSubmit(App);
  }
}

// ETT, petition, survey, quiz and data capture submits.
function trackSignupFormSubmit(App) {
  // Bail out instead of throwing a ReferenceError, which would abort the
  // form submission.
  if (!isTealiumDataLoaded()) {
    return;
  }

  const signup = getSignupSubmission(App);
  if (signup) {
    trackEvent(signup.eventName, signup.data);
    return;
  }

  if (isFinalQuizStep(App)) {
    trackEvent("form_submitted", {
      form_type: pageJson.pageType,
      form_name: getFormName(),
    });
  }
}

function getSignupSubmission(App) {
  // The quiz lead-gen modal's fields are part of the quiz step's form,
  // and Quiz already tracks that signup when the modal is submitted.
  const isSignupTrackedByQuizModal =
    document.querySelector(".modal--lead-gen") !== null;

  if (
    App.getFieldValue("supporter.emailAddress") === "" ||
    isSignupTrackedByQuizModal
  ) {
    return null;
  }

  const eventName = getSubmitEventName(App);
  const isTextSignup =
    eventName === "frm_emt_txt_submit" ||
    eventName === "frm_emt_emo_txt_submit";

  const data = {
    form_type: pageJson.pageType,
    form_name: getFormName(),
    action_id: utag_data.form_name,
    action_type: pageJson.pageType,
    zip_code: App.getFieldValue("supporter.postcode"),
    email_signup_location: pageJson.pageType,
    // Enhanced conversion fields
    const_first: App.getFieldValue("supporter.firstName"),
    const_last: App.getFieldValue("supporter.lastName"),
    const_address: App.getFieldValue("supporter.address1"),
    const_city: App.getFieldValue("supporter.city"),
    customer_state: App.getFieldValue("supporter.region"),
    customer_postal_code: App.getFieldValue("supporter.postcode"),
    customer_country: App.getFieldValue("supporter.country"),
    const_phone: App.getFieldValue("supporter.phoneNumber2"),
  };
  if (isTextSignup) {
    data.text_signup_location = pageJson.pageType;
  }

  return { eventName, data };
}

function getSubmitEventName(App) {
  const isOptedInToPhone =
    hasMobilePhoneOptIn(App) || hasHomePhoneAsMobileOptIn(App);
  const isOptedInToEmailUpdates = isOptedInToEmail();

  if (isOptedInToEmailUpdates && isOptedInToPhone) {
    return "frm_emt_emo_txt_submit";
  }
  if (isOptedInToPhone) {
    return "frm_emt_txt_submit";
  }
  if (isOptedInToEmailUpdates) {
    return "frm_emt_emo_submit";
  }
  return "frm_emt_submit";
}

function isFinalQuizStep(App) {
  return (
    document.body.dataset.engridSubpagetype === "quiz" &&
    App.getPageNumber() === App.getPageCount() - 1
  );
}

// ---------------------------------------------------------------------------
// Error tracking
// ---------------------------------------------------------------------------

export function trackFormErrors() {
  // Waits for ENgrid's conditionally required error messages, which are
  // themselves delayed until EN's messages have rendered.
  setTimeout(() => {
    let invalidFields = "";
    let errors = "";

    document.querySelectorAll(".en__field--validationFailed").forEach((el) => {
      if (el.querySelector(".en__field__error")) {
        invalidFields += `${el
          .querySelector(".en__field__input")
          .getAttribute("name")}|`;
        errors += `${el.querySelector(".en__field__error").textContent}|`;
      }
    });

    if (invalidFields !== "") {
      trackEvent("form_error", {
        form_field_error_field: invalidFields.slice(0, -1),
        form_field_error_value: errors.slice(0, -1),
        form_name: getFormName(),
        form_type: pageJson.pageType,
      });
    }
  }, 500);
}

export function trackProcessingErrors(App) {
  const errorList = document.querySelector(".en__errorList");

  if (errorList && errorList.textContent.trim() !== "") {
    trackEvent("form_error", {
      form_field_error_field: "payment error",
      form_field_error_value: "payment error",
      payment_type: App.getPaymentType(),
      form_name: getFormName(),
      form_type: pageJson.pageType,
    });
  }
}

// ---------------------------------------------------------------------------
// User interaction tracking
// ---------------------------------------------------------------------------

export function trackUserInteractions() {
  document.querySelectorAll(".en__socialShare__image").forEach((el) => {
    el.addEventListener("click", (e) => {
      trackEvent("social_share", {
        social_share_id: `preserve.nature.org.share.${e.target.parentElement.dataset.enshare}`,
        social_share_platform: e.target.parentElement.dataset.enshare,
      });
    });
  });

  document.querySelectorAll(".main-page-footer a").forEach((el) => {
    el.addEventListener("click", (e) => {
      trackEvent("footer_nav_click", {
        nav_click_location: `preserve.nature.org.fnav.${e.target.textContent.toLowerCase()}`,
      });
    });
  });

  // EN injects the sustainer upsell modal after load.
  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.firstChild && node.firstChild.id === "en__upsellModal") {
            trackEvent("lightbox_impression", {
              lightbox_name: "sustainer upsell",
            });
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
