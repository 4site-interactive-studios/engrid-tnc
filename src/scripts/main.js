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
