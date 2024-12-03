import { ENGrid } from "@4site/engrid-scripts";
import { QuizLeadGenModal } from "./quiz-lead-gen-modal";
import { trackEvent } from "./tracking";

declare global {
  interface Window {
    utag_data: any;
  }
}

export class Quiz {
  constructor() {
    if (!this.shouldRun()) return;
    this.addEventListeners();
    this.showQuizResults();
    this.createLeadGenModal();
  }

  private shouldRun() {
    return ENGrid.getBodyData("subpagetype") === "quiz";
  }

  private createLeadGenModal() {
    const leadGenModal = document.querySelector(".modal--lead-gen");
    if (!leadGenModal) return;

    // Set placeholder on mobile phone field so it can be selected with :placeholder-shown
    leadGenModal
      .querySelector("#en__field_supporter_phoneNumber2")
      ?.setAttribute("placeholder", " ");

    const formType = this.getFormType(leadGenModal);

    const modal = new QuizLeadGenModal();

    // Fire tracking
    setTimeout(function () {
      trackEvent("lightbox_form_impression", {
        lightbox_name: formType.lightbox_name,
        form_type: formType.form_type,
        form_name: formType.form_name,
      });
    }, 100);
  }

  private addEventListeners() {
    // Handle check answer button click
    const checkAnswerButton = document.querySelector(
      ".quiz-answer .check-answer"
    );
    if (checkAnswerButton) {
      checkAnswerButton.addEventListener("click", () => {
        console.log("Check answer clicked");
        const checkedAnswerEl = document.querySelector(
          ".en__field__input--radio:checked"
        );
        if (!checkedAnswerEl) {
          this.displayElement(".en__field__error", true);
          return;
        }
        this.displayElement(".quiz-answer .en__submit", false);
        this.displayElement(".en__field__error", false);
        this.checkAnswer();
      });
    }

    // Handle submit button click
    const submitButton = document.querySelector(
      '.en__submit button:not([type="button"])'
    );
    if (submitButton) {
      submitButton.addEventListener("click", () => {
        sessionStorage.setItem("alreadyAnswered", "false");
      });
    }

    // Clicking any answer removes error message
    [...document.querySelectorAll(".en__field__input--radio")].forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelector(".en__field__error")?.remove();
      });
    });

    // Listen for validation error
    const survey = document.querySelector(".en__field--survey");
    if (survey) {
      const mutationCallback = (mutationsList: MutationRecord[]) => {
        for (let i = 0; i < mutationsList.length; i++) {
          if (mutationsList[i].addedNodes.length > 0) {
            // Move error message to end of form
            const el = document.querySelector(".en__field__error");

            if (el) {
              document.querySelector(".en__component--formblock")?.append(el);
            }
          }
        }
      };

      const errorObserver = new MutationObserver(mutationCallback);

      errorObserver.observe(survey, {
        attributes: false,
        childList: true,
        subtree: false,
      });
    }
  }

  private checkAnswer() {
    const correctAnswer = document.querySelector(".correct") as HTMLElement;
    const incorrectAnswer = document.querySelector(".incorrect") as HTMLElement;
    const selectedAnswerRadio = document.querySelector(
      ".en__field__input--radio:checked"
    ) as HTMLElement;
    const correctAnswerRadio = document.querySelector(
      '.en__field__input--radio[value="1"]'
    ) as HTMLElement;
    let questionCount = sessionStorage.getItem("questionCount")
      ? Number(sessionStorage.getItem("questionCount"))
      : 0;
    let quizScore = sessionStorage.getItem("quizScore")
      ? Number(sessionStorage.getItem("quizScore"))
      : 0;
    let alreadyAnswered = sessionStorage.getItem("alreadyAnswered")
      ? sessionStorage.getItem("alreadyAnswered")
      : "false";

    // Prevent more answer clicks
    document.querySelectorAll(".en__field__input--radio").forEach((el) => {
      el.setAttribute("disabled", "true");
    });

    if (correctAnswer && incorrectAnswer && correctAnswerRadio) {
      // Check for correct answer
      if (selectedAnswerRadio === correctAnswerRadio) {
        correctAnswer.style.display = "inline";
        // Update running score
        if (alreadyAnswered === "false") {
          quizScore++;
        }
      } else {
        selectedAnswerRadio.nextElementSibling?.classList.add("is-incorrect");
        incorrectAnswer.style.display = "inline";
      }
      correctAnswerRadio.nextElementSibling?.classList.add("is-correct");
      // Show answer
      this.displayElement(".quiz-answer p", true);
      // Show next question button
      this.displayElement(".en__component--formblock:last-child", true);

      if (alreadyAnswered === "false") {
        // Update running count of quiz questions
        questionCount++;
        sessionStorage.setItem("questionCount", questionCount.toString());
        // Save running score
        sessionStorage.setItem("quizScore", quizScore.toString());
        sessionStorage.setItem("alreadyAnswered", "true");
      }
    }
  }

  private displayElement(selector: string, visible: boolean) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
      el.style.display = visible ? "block" : "none";
    }
  }

  private showQuizResults() {
    if (ENGrid.getPageNumber() !== ENGrid.getPageCount()) return;

    // Display quiz score
    const quizScoreEl = document.querySelector(".js-quiz-score");
    if (quizScoreEl && sessionStorage.getItem("quizScore")) {
      quizScoreEl.textContent = sessionStorage.getItem("quizScore");
    }

    // Display number of questions
    const questionCountEl = document.querySelector(".js-question-count");
    if (questionCountEl && sessionStorage.getItem("questionCount")) {
      questionCountEl.textContent = sessionStorage.getItem("questionCount");
    }

    // Clean up
    sessionStorage.removeItem("quizScore");
    sessionStorage.removeItem("questionCount");
    sessionStorage.removeItem("alreadyAnswered");
  }

  private getFormType(form: Element) {
    const emailUnsubscribeField = form.querySelector(
      ".en__field--unsubscribe-from-emails:not(.en__hidden) .en__field__input--checkbox"
    ) as HTMLFormElement;
    const emailUnsubscribeChecked = emailUnsubscribeField?.checked || false;
    const mobilePhoneField = form.querySelector(
      "#en__field_supporter_phoneNumber2:not(:placeholder-shown)"
    );
    const textOptInField = form.querySelector(
      ".en__field--home-phone-opt-in .en__field__input--checkbox"
    ) as HTMLFormElement;
    const textOptInChecked = textOptInField?.checked || false;

    let formType = {
      lightbox_name: `lightbox-${window.utag_data.page_name}`,
      form_name: `lightbox-${window.utag_data.page_name}`,
      email_signup_location: `lightbox-${window.utag_data.page_name}`,
      event_name: "",
      form_type: "",
      text_signup_location: "",
    };

    //Unsubscribe not checked, mobile phone field exists and optin checked
    if (!emailUnsubscribeChecked && mobilePhoneField && textOptInChecked) {
      formType.event_name = "frm_ltbx_emt_emo_txt_txto_submit";
      formType.form_type = "email_text_signup";
      formType.text_signup_location = "lightbox-" + window.utag_data.page_name;
      //Unsubscribe not checked, mobile phone field exists (and optin not checked)
    } else if (!emailUnsubscribeChecked && mobilePhoneField) {
      formType.event_name = "frm_ltbx_emt_emo_txt_submit";
      formType.form_type = "email_text_signup";
      formType.text_signup_location = "lightbox-" + window.utag_data.page_name;
      //Unsubscribe not checked, no mobile phone field
    } else if (!emailUnsubscribeChecked) {
      formType.event_name = "frm_ltbx_emt_emo_submit";
      formType.form_type = "email_signup";
      //Unsubscribe checked, mobile phone field exists and optin checked
    } else if (mobilePhoneField && textOptInChecked) {
      formType.event_name = "rm_ltbx_emt_txt_txto_submit";
      formType.form_type = "email_text_signup";
      formType.text_signup_location = "lightbox-" + window.utag_data.page_name;
      //Unsubscribe checked, mobile phone field exists and optin not checked
    } else if (mobilePhoneField) {
      formType.event_name = "frm_ltbx_emt_txt_submit";
      formType.form_type = "email_text_signup";
      formType.text_signup_location = "lightbox-" + window.utag_data.page_name;
      //Unsubscribe checked, mobile phone field doesn't exist
    } else {
      formType.event_name = "frm_ltbx_emt_submit";
      formType.form_type = "email_signup";
    }

    return formType;
  }
}
