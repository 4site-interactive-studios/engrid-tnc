export const customScript = function () {
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
      let floatingButton = document.createElement("div");
      floatingButton.id = "floating-button";
      floatingButton.className = "arrow";
      floatingButton.innerHTML =
        "<div class='en__submit'><a class='pseduo__en__submit_button' href='#firstElement'>Placeholder</a></div>";
      let advRow = document.querySelector(".en__component--advrow");
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
