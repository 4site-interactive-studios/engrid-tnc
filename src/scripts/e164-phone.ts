import { ENGrid, EnForm, EngridLogger } from "@4site/engrid-scripts";
import { PHONE_COUNTRIES, PhoneCountry } from "./e164-phone-countries";

interface SavedSubmission {
  pageId: string;
  displayValue: string;
  countryCode: string;
}

const PREFERRED_COUNTRY_CODES = ["us", "ca", "gb"];

// A + number with a shared calling code shows this country, unless the
// selected country already uses that code.
const PRIMARY_COUNTRY_BY_DIAL_CODE: Record<string, string> = {
  "1": "us",
  "7": "ru",
  "39": "it",
  "44": "gb",
  "47": "no",
  "61": "au",
  "212": "ma",
  "262": "re",
  "358": "fi",
  "590": "gp",
  "599": "cw",
};

// The digits from the calling code on, or null for a national number. The +
// can follow a bracket, as in "(+44) 7400 123456".
function getInternationalDigits(number: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (/^\D*\+/.test(number)) return digits;
  if (number.startsWith("00")) return digits.slice(2);
  return null;
}

// Reformats only; the number is not validated.
function toE164(value: string, country: PhoneCountry): string {
  const number = value
    .replace(/\s*(?:ext|x)\.?\s*\d+\s*$/i, "")
    // UK-style "+44 (0)20 ..." shows the trunk prefix in brackets.
    .replace(/\(0\)/, "")
    .trim();
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  const internationalDigits = getInternationalDigits(number);
  if (internationalDigits !== null) return `+${internationalDigits}`;

  const { trunkPrefix, dialCode } = country;
  const nationalNumber =
    trunkPrefix && digits.startsWith(trunkPrefix)
      ? digits.slice(trunkPrefix.length)
      : digits;
  return `+${dialCode}${nationalNumber}`;
}

function preferredRank(country: PhoneCountry): number {
  const index = PREFERRED_COUNTRY_CODES.indexOf(country.code);
  return index === -1 ? PREFERRED_COUNTRY_CODES.length : index;
}

export class E164Phone {
  private readonly fieldName = "supporter.phoneNumber2";
  private readonly storageKey = "engrid_e164_phone_submission";
  private readonly form = EnForm.getInstance();
  private readonly logger = new EngridLogger(
    "E164Phone",
    "#FFFFFF",
    "#4d9068",
    "☎"
  );
  private readonly pageId = String(ENGrid.getPageID() || "");
  private readonly countries = [...PHONE_COUNTRIES].sort(
    (a, b) =>
      preferredRank(a) - preferredRank(b) || a.name.localeCompare(b.name)
  );
  private readonly selector = document.createElement("div");
  private readonly button = document.createElement("button");
  private readonly selectedFlag = document.createElement("span");
  private readonly list = document.createElement("ul");
  private input: HTMLInputElement | null = null;
  // The list starts with the preferred countries, United States first.
  private selectedCountry = this.countries[0];
  private highlightedCountry: PhoneCountry | null = null;
  // Set once the supporter picks a country or the field holds a + number, so
  // the IP lookup doesn't replace it.
  private countryFromSupporter = false;
  // While the field holds the E.164 value, what the supporter typed.
  private submittedValue: string | null = null;
  private convertedValue: string | null = null;

  constructor() {
    const input = ENGrid.getField(this.fieldName);
    const fieldElement = input?.closest(".en__field__element");
    if (
      !(input instanceof HTMLInputElement) ||
      !(fieldElement instanceof HTMLElement) ||
      document.querySelector(
        ".en__component--formblock.engrid-phone-no-country-select"
      )
    ) {
      this.logger.log(
        "Phone enhancement is disabled or the phone field is missing"
      );
      return;
    }

    this.input = input;
    this.renderCountrySelector(fieldElement, input);
    this.addEventListeners(input);
    this.setSelectedCountry(this.selectedCountry);

    if (this.restoreFailedSubmission()) return;
    this.updateCountryFromNumber();
    void this.setCountryFromIp();
  }

  // --- Selector ---------------------------------------------------------------

  private renderCountrySelector(
    fieldElement: HTMLElement,
    input: HTMLInputElement
  ) {
    fieldElement.classList.add("e164-phone--enhanced");
    input
      .closest(".en__component--formblock")
      ?.classList.add("e164-phone--enhanced-form");

    // The selector sits over the input, so it needs the input's margins.
    const inputStyle = window.getComputedStyle(input);
    fieldElement.style.setProperty(
      "--e164-phone-margin-top",
      inputStyle.marginTop
    );
    fieldElement.style.setProperty(
      "--e164-phone-margin-bottom",
      inputStyle.marginBottom
    );

    this.selector.className = "e164-phone";

    this.button.type = "button";
    this.button.className = "e164-phone__selected";
    // Select-only combobox pattern; aria-activedescendant isn't supported on a
    // plain button.
    this.button.setAttribute("role", "combobox");
    this.button.setAttribute("aria-haspopup", "listbox");
    this.button.setAttribute("aria-expanded", "false");
    this.button.setAttribute("aria-controls", "e164-phone-country-list");
    this.selectedFlag.className = "e164-phone__selected-flag";
    const arrow = document.createElement("span");
    arrow.className = "e164-phone__arrow";
    arrow.setAttribute("aria-hidden", "true");
    this.button.append(this.selectedFlag, arrow);

    this.list.id = "e164-phone-country-list";
    this.list.className = "e164-phone__list";
    this.list.setAttribute("role", "listbox");
    this.list.setAttribute("aria-label", "Countries and territories");
    this.list.hidden = true;
    const lastPreferredCode =
      PREFERRED_COUNTRY_CODES[PREFERRED_COUNTRY_CODES.length - 1];
    this.countries.forEach((country) => {
      this.list.appendChild(this.createCountryOption(country));
      if (country.code === lastPreferredCode) {
        const divider = document.createElement("li");
        divider.className = "e164-phone__divider";
        divider.setAttribute("role", "separator");
        this.list.appendChild(divider);
      }
    });

    this.selector.append(this.button, this.list);
    fieldElement.insertBefore(this.selector, input);
  }

  private createCountryOption(country: PhoneCountry): HTMLLIElement {
    const item = document.createElement("li");
    item.id = `e164-phone-country-${country.code}`;
    item.className = "e164-phone__country";
    item.dataset.countryCode = country.code;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", "false");

    const name = document.createElement("span");
    name.className = "e164-phone__country-name";
    name.textContent = country.name;
    const dialCode = document.createElement("span");
    dialCode.className = "e164-phone__dial-code";
    dialCode.textContent = `+${country.dialCode}`;
    item.append(this.createFlag(country), name, dialCode);
    return item;
  }

  private createFlag(country: PhoneCountry): HTMLSpanElement {
    const wrapper = document.createElement("span");
    wrapper.className = "e164-phone__flag";
    wrapper.setAttribute("aria-hidden", "true");

    const flagUrl = (height: number, format: string) =>
      `https://flagcdn.com/h${height}/${country.code}.${format}`;
    const picture = document.createElement("picture");
    const webp = document.createElement("source");
    webp.type = "image/webp";
    webp.srcset = `${flagUrl(20, "webp")}, ${flagUrl(40, "webp")} 2x, ${flagUrl(
      60,
      "webp"
    )} 3x`;
    const png = document.createElement("source");
    png.type = "image/png";
    png.srcset = `${flagUrl(20, "png")}, ${flagUrl(40, "png")} 2x, ${flagUrl(
      60,
      "png"
    )} 3x`;
    const image = document.createElement("img");
    image.src = flagUrl(20, "png");
    image.alt = "";
    image.width = 24;
    image.height = 16;
    image.setAttribute("loading", "lazy");
    image.addEventListener("error", () => {
      wrapper.classList.add("e164-phone__flag--failed");
      wrapper.textContent = country.code.toUpperCase();
    });
    picture.append(webp, png, image);
    wrapper.appendChild(picture);
    return wrapper;
  }

  private setSelectedCountry(country: PhoneCountry) {
    if (this.input) this.input.placeholder = country.placeholder;
    if (this.button.dataset.countryCode === country.code) return;

    this.selectedCountry = country;
    this.button.dataset.countryCode = country.code;
    this.selectedFlag.textContent = "";
    this.selectedFlag.appendChild(this.createFlag(country));
    this.button.setAttribute(
      "aria-label",
      `Select country. Current selection: ${country.name}, +${country.dialCode}`
    );
    this.button.title = `Select country (${country.name}, +${country.dialCode})`;
    this.list
      .querySelectorAll<HTMLLIElement>("li[data-country-code]")
      .forEach((item) => {
        const selected = item.dataset.countryCode === country.code;
        item.setAttribute("aria-selected", String(selected));
        item.classList.toggle("e164-phone__country--selected", selected);
      });
  }

  private selectCountryManually(country: PhoneCountry) {
    this.countryFromSupporter = true;
    this.setSelectedCountry(country);
    this.closeCountrySelector();
    this.input?.focus();
  }

  // --- Selector interaction ---------------------------------------------------

  private addEventListeners(input: HTMLInputElement) {
    input.addEventListener("input", () => {
      this.forgetSubmission();
      this.updateCountryFromNumber();
    });

    this.button.addEventListener("click", () => {
      if (this.list.hidden) {
        this.openCountrySelector();
      } else {
        this.closeCountrySelector();
      }
    });
    this.button.addEventListener("keydown", (event) =>
      this.handleSelectorKeydown(event)
    );
    // Keeps focus on the button while an option is clicked.
    this.list.addEventListener("mousedown", (event) => event.preventDefault());
    this.list.addEventListener("click", (event) => {
      const item = (event.target as HTMLElement).closest<HTMLLIElement>(
        "li[data-country-code]"
      );
      const country = this.getCountryByCode(item?.dataset.countryCode);
      if (country) this.selectCountryManually(country);
    });
    document.addEventListener("click", (event) => {
      if (!this.list.hidden && !this.selector.contains(event.target as Node)) {
        this.closeCountrySelector();
      }
    });

    this.form.onIntentSubmit.subscribe(() => this.convertForSubmission());
    this.form.onError.subscribe(this.restoreSubmittedValue);
    ENGrid.watchForError(this.restoreSubmittedValue);
  }

  private handleSelectorKeydown(event: KeyboardEvent) {
    if (this.list.hidden) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.openCountrySelector();
      }
      return;
    }

    if (event.key === "Tab") {
      this.closeCountrySelector();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.closeCountrySelector(true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (this.highlightedCountry) {
        this.selectCountryManually(this.highlightedCountry);
      }
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      this.moveHighlight(event.key);
    }
  }

  private openCountrySelector() {
    this.list.hidden = false;
    this.selector.classList.add("e164-phone--open");
    this.button.setAttribute("aria-expanded", "true");
    this.highlightCountry(this.selectedCountry);
  }

  private closeCountrySelector(returnFocus = false) {
    this.list.hidden = true;
    this.selector.classList.remove("e164-phone--open");
    this.button.setAttribute("aria-expanded", "false");
    this.button.removeAttribute("aria-activedescendant");
    if (returnFocus) this.button.focus();
  }

  private moveHighlight(key: string) {
    const lastIndex = this.countries.length - 1;
    const currentIndex = this.countries.indexOf(
      this.highlightedCountry || this.selectedCountry
    );
    const nextIndex =
      key === "Home"
        ? 0
        : key === "End"
        ? lastIndex
        : key === "ArrowDown"
        ? Math.min(lastIndex, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    this.highlightCountry(this.countries[nextIndex]);
  }

  private highlightCountry(country: PhoneCountry) {
    this.highlightedCountry = country;
    this.list
      .querySelectorAll(".e164-phone__country--highlighted")
      .forEach((item) =>
        item.classList.remove("e164-phone__country--highlighted")
      );
    const item = this.list.querySelector<HTMLElement>(
      `li[data-country-code="${country.code}"]`
    );
    item?.classList.add("e164-phone__country--highlighted");
    item?.scrollIntoView({ block: "nearest" });
    this.button.setAttribute(
      "aria-activedescendant",
      `e164-phone-country-${country.code}`
    );
  }

  // --- Country ----------------------------------------------------------------

  private getCountryByCode(code: string | null | undefined) {
    if (!code) return undefined;
    return this.countries.find(
      (country) => country.code === code.toLowerCase()
    );
  }

  private updateCountryFromNumber() {
    if (!this.input) return;
    const country = this.getCountryFromCallingCode(this.input.value);
    if (!country) return;
    this.countryFromSupporter = true;
    this.setSelectedCountry(country);
  }

  private getCountryFromCallingCode(value: string): PhoneCountry | undefined {
    const internationalDigits = getInternationalDigits(value.trim()) || "";

    // Calling codes are 1 to 3 digits and prefix-free, so the first match is
    // the only one.
    const maxLength = Math.min(3, internationalDigits.length);
    for (let length = 1; length <= maxLength; length++) {
      const dialCode = internationalDigits.slice(0, length);
      if (this.selectedCountry.dialCode === dialCode) {
        return this.selectedCountry;
      }
      const country =
        this.getCountryByCode(PRIMARY_COUNTRY_BY_DIAL_CODE[dialCode]) ||
        this.countries.find((country) => country.dialCode === dialCode);
      if (country) return country;
    }
    return undefined;
  }

  private async setCountryFromIp() {
    let country: PhoneCountry | undefined;
    try {
      const response = await fetch(
        `https://${window.location.hostname}/cdn-cgi/trace`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const trace = await response.text();
      const location = trace
        .split("\n")
        .find((line) => line.startsWith("loc="))
        ?.slice(4);
      country = this.getCountryByCode(location);
    } catch (error) {
      this.logger.log("Unable to determine phone country from IP", error);
    }
    country =
      country ||
      this.getCountryByCode(ENGrid.getFieldValue("supporter.country"));
    if (country && !this.countryFromSupporter) {
      this.setSelectedCountry(country);
    }
  }

  // --- Submission -------------------------------------------------------------

  private convertForSubmission() {
    if (!this.input) return;
    const value = this.input.value;
    // Submit hooks can run more than once; keep what the supporter typed.
    if (!value.trim() || value === this.convertedValue) return;

    this.submittedValue = value;
    this.saveSubmission({
      pageId: this.pageId,
      displayValue: value,
      countryCode: this.selectedCountry.code,
    });
    this.convertedValue = toE164(value, this.selectedCountry);
    this.input.value = this.convertedValue;
    this.logger.log(`Formatted phone for submission: ${this.convertedValue}`);
  }

  private restoreSubmittedValue = () => {
    if (!this.input || this.submittedValue === null) return;
    if (this.input.value === this.convertedValue) {
      this.input.value = this.submittedValue;
      this.logger.log("Restored phone display value after submission error");
    }
    this.forgetSubmission();
  };

  // EN reloads the page after a server-side error, with the E.164 value in
  // the field.
  private restoreFailedSubmission(): boolean {
    const saved = this.readSavedSubmission();
    this.forgetSubmission();
    if (!this.input || !saved || saved.pageId !== this.pageId) return false;
    if (!this.submissionFailed()) return false;

    const country = this.getCountryByCode(saved.countryCode);
    if (country) this.setSelectedCountry(country);
    this.input.value = saved.displayValue;
    this.logger.log("Restored phone display value after submission error");
    return true;
  }

  private forgetSubmission() {
    this.submittedValue = null;
    this.convertedValue = null;
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (_error) {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }
  }

  private submissionFailed(): boolean {
    return (
      ENGrid.checkNested(
        window.EngagingNetworks,
        "require",
        "_defined",
        "enjs",
        "checkSubmissionFailed"
      ) && window.EngagingNetworks.require._defined.enjs.checkSubmissionFailed()
    );
  }

  private saveSubmission(submission: SavedSubmission) {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(submission));
    } catch (error) {
      this.logger.log("Unable to save phone display state", error);
    }
  }

  private readSavedSubmission(): SavedSubmission | null {
    try {
      const value = sessionStorage.getItem(this.storageKey);
      const parsed: unknown = value ? JSON.parse(value) : null;
      if (!parsed || typeof parsed !== "object") return null;
      const { pageId, displayValue, countryCode } = parsed as Record<
        string,
        unknown
      >;
      if (
        typeof pageId !== "string" ||
        typeof displayValue !== "string" ||
        typeof countryCode !== "string"
      ) {
        return null;
      }
      return { pageId, displayValue, countryCode };
    } catch (error) {
      this.logger.log("Unable to read phone display state", error);
      return null;
    }
  }
}
