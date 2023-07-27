const tippy = require("tippy.js").default;

export const customScript = function (App) {
  console.log("ENGrid client scripts are executing");
  // Add your client scripts here
  var checkForServerError = document.querySelector(".en__errorList *");
  if (checkForServerError) {
    console.log("Has server error!");
  } else {
    console.log("Does not have a server error!");

    // Check if the first field is in the viewport
    let firstElement = document.querySelector(".en__component--formblock");
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

  //ENgrid transition scripts
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

  App.addHtml(
    '<div class="en__field__notice">You\'ll receive email updates from The Nature Conservancy. You can unsubscribe at any time.</div>',
    '[name="supporter.emailAddress"]',
    "after"
  );

  App.addHtml(
    '<div class="en__field__notice">By sharing your phone number, you give The Nature Conservancy permission to contact you with updates via phone and text.</div>',
    '[name="supporter.phoneNumber2"]',
    "after"
  );

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

  addTooltip(
    document.querySelector(".en__field--ccvv > label"),
    "cvv",
    "What is a CVV number?",
    "The CVV is a 3- or 4-digit code printed on your credit card. It's a fraud-prevention measure designed to make it harder to use info stolen in a data breach."
  );

  addTooltip(
    document.querySelector(".en__field--bankRoutingNumber > label"),
    "bankNumber",
    "What is this?",
    "Your routing number is the 9-digit number at the bottom left of your check."
  );
};

/**
 * Track data capture submits
 */
export const dataCaptureTracking = function () {
  if (pageJson.pageType === "otherdatacapture") {
    if (typeof utag !== "undefined") {
      utag.link({
        event_name: "frm_emt_submit",
        form_type: "otherdatacapture",
        form_name: utag_data.page_name.slice(0, -2),
        email_signup_location: "otherdatacapture",
      });
    }
  }
};
