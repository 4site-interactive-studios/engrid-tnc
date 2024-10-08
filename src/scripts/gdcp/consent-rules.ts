import { GdcpField } from "./interfaces/gdcp-field.interface";

/**
 * Rule for preselected checkbox
 * Check the GDCP field and all its associated opt-in fields
 */
export function preselectedCheckedRule(gdcpField: GdcpField) {
  const gdcpInput = document.querySelector(
    `input[name="${gdcpField.gdcpFieldName}"]`
  ) as HTMLInputElement;
  if (!gdcpInput) return;

  //TODO: logic for when switching back from unchecked to checked -- should not re-select if field is dirty.

  gdcpInput.checked = true;

  gdcpField.optInFieldNames.forEach((fieldName) => {
    const optInInput = document.querySelector(
      `input[name="${fieldName}"]`
    ) as HTMLInputElement;
    if (optInInput) {
      optInInput.checked = true;
    }
  });

  const gdcpInputWrapper = gdcpInput.closest(".en__field__item") as HTMLElement;
  if (gdcpInputWrapper) {
    gdcpInputWrapper.classList.remove("hide");
  }

  const hiddenFieldNotice = document.querySelector(
    `.${gdcpField.channel}-description`
  ) as HTMLElement;
  if (hiddenFieldNotice) {
    hiddenFieldNotice.classList.add("hide");
  }
}

/**
 * Rule for checkbox
 * Uncheck the GDCP field and all its associated opt-in fields
 */
export function checkboxRule(gdcpField: GdcpField) {
  const gdcpInput = document.querySelector(
    `input[name="${gdcpField.gdcpFieldName}"]`
  ) as HTMLInputElement;
  if (!gdcpInput) return;

  //TODO: logic for when switching back from unchecked to checked -- should not re-select if field is dirty.

  gdcpInput.checked = false;

  gdcpField.optInFieldNames.forEach((fieldName) => {
    const optInInput = document.querySelector(
      `input[name="${fieldName}"]`
    ) as HTMLInputElement;
    if (optInInput) {
      optInInput.checked = false;
    }
  });

  const gdcpInputWrapper = gdcpInput.closest(".en__field__item") as HTMLElement;
  if (gdcpInputWrapper) {
    gdcpInputWrapper.classList.remove("hide");
  }

  const hiddenFieldNotice = document.querySelector(
    `.${gdcpField.channel}-description`
  ) as HTMLElement;
  if (hiddenFieldNotice) {
    hiddenFieldNotice.classList.add("hide");
  }
}

/**
 * Rule for hidden checkbox
 * Visually hide the GDCP field
 * Show the hidden field text
 * Check the GDCP field and all its associated opt-in fields
 */
export function hiddenCheckboxRule(gdcpField: GdcpField) {
  const gdcpInput = document.querySelector(
    `input[name="${gdcpField.gdcpFieldName}"]`
  ) as HTMLInputElement;
  if (!gdcpInput) return;

  //TODO: logic for when switching back from unchecked to checked -- should not re-select if field is dirty.

  const gdcpInputWrapper = gdcpInput.closest(".en__field__item") as HTMLElement;
  if (gdcpInputWrapper) {
    gdcpInputWrapper.classList.add("hide");
  }

  const hiddenFieldNotice = document.querySelector(
    `.${gdcpField.channel}-description`
  ) as HTMLElement;
  if (hiddenFieldNotice) {
    hiddenFieldNotice.classList.remove("hide");
  }

  gdcpInput.checked = true;

  gdcpField.optInFieldNames.forEach((fieldName) => {
    const optInInput = document.querySelector(
      `input[name="${fieldName}"]`
    ) as HTMLInputElement;
    if (optInInput) {
      optInInput.checked = true;
    }
  });
}

export function doubleOptInRule(gdcpField: GdcpField) {
  return true;
}

export function hiddenNoQcbRule(gdcpField: GdcpField) {
  hiddenCheckboxRule(gdcpField);
}
