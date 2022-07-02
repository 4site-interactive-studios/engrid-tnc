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
      floatingButton.style.opacity = "0";
      floatingButton.innerHTML =
        "<div class='en__submit'><a class='pseduo__en__submit_button' href='#firstElement'>Placeholder</a></div>";
      let advRow = document.querySelector(".en__component--advrow");
      advRow.append(floatingButton);
    }
  }
};
