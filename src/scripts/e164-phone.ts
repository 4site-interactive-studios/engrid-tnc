import {
  AsYouType,
  CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import { ENGrid, EnForm, EngridLogger } from "@4site/engrid-scripts";

interface PhoneCountry {
  code: string;
  libraryCode: CountryCode;
  name: string;
  dialCode: string;
  placeholder: string;
}

interface PendingSubmission {
  pageId: string;
  fieldName: string;
  displayValue: string;
  countryCode: string;
}

interface DisplayNamesInstance {
  of(code: string): string | undefined;
}

interface DisplayNamesConstructor {
  new (
    locales: string[],
    options: { type: "region"; fallback: "code" }
  ): DisplayNamesInstance;
}

// The project's TypeScript DOM lib predates ResizeObserver.
interface ResizeObserverConstructor {
  new (callback: () => void): { observe(target: Element): void };
}

const PREFERRED_COUNTRY_ORDER: Record<string, number> = {
  us: 0,
  ca: 1,
  gb: 2,
};

const PRIMARY_COUNTRY_BY_CALLING_CODE: Record<string, string> = {
  "1": "us",
  "7": "ru",
  "39": "it",
  "44": "gb",
  "47": "no",
  "61": "au",
  "212": "ma",
  "262": "re",
  "290": "sh",
  "358": "fi",
  "590": "gp",
  "599": "cw",
};

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
  private readonly countries: PhoneCountry[];
  private readonly input: HTMLInputElement | null;
  private readonly originalPlaceholder: string;
  private readonly pageId = String(ENGrid.getPageID() || "");
  private selectedCountry: PhoneCountry;
  private countrySelector: HTMLElement | null = null;
  private countryButton: HTMLButtonElement | null = null;
  private countryList: HTMLUListElement | null = null;
  private pendingSubmission: PendingSubmission | null = null;
  private convertedValue: string | null = null;
  // Set once the supporter picks a country or gives an international number;
  // automatic guesses (IP, hints) must not replace it after that.
  private countryCameFromSupporter = false;
  private ipCountry: PhoneCountry | null = null;
  private supporterCountryHint: PhoneCountry | null = null;
  private isSettingDisplayValue = false;
  private highlightedCountry: PhoneCountry | null = null;

  // --- Initialization ---------------------------------------------------------

  constructor() {
    const field = ENGrid.getField(this.fieldName);
    if (!this.shouldRun(field)) {
      this.input = null;
      this.countries = [];
      this.originalPlaceholder = "";
      this.selectedCountry = this.createFallbackCountry();
      this.logger.log(
        "Phone enhancement is disabled or the phone field is missing"
      );
      return;
    }

    // Restore only matching failed submissions; clear other stale state.
    const savedSubmission = this.readSavedSubmission();
    const restoreValue =
      this.submissionFailed() &&
      savedSubmission &&
      savedSubmission.pageId === this.pageId &&
      savedSubmission.fieldName === this.fieldName
        ? savedSubmission
        : null;
    if (!restoreValue) this.clearSavedSubmission();

    this.input = field;
    this.originalPlaceholder = field.placeholder;
    this.countries = this.createCountryList();
    this.selectedCountry =
      this.getCountryByCode("us") || this.createFallbackCountry();

    // Build the UI before applying restored or automatic country evidence.
    this.renderCountrySelector();
    this.addEventListeners();

    if (restoreValue) {
      this.pendingSubmission = restoreValue;
      this.restoreDisplayValue();
      return;
    }

    // A recognised supporter country can break shared-code ties.
    const supporterId = (
      window as unknown as {
        pageJson?: { supporterId?: string | number };
      }
    ).pageJson?.supporterId;
    if (Boolean(supporterId)) {
      this.supporterCountryHint =
        this.getCountryByCode(ENGrid.getFieldValue("supporter.country")) ||
        null;
    }
    this.setSelectedCountry(this.selectedCountry);

    // A prefilled international number settles the country before the IP lookup.
    this.moveCallingCodeToSelector();
    void this.setCountryFromIp();
  }

  private shouldRun(field: Element | null): field is HTMLInputElement {
    return (
      field instanceof HTMLInputElement &&
      !document.querySelector(
        ".en__component--formblock.engrid-phone-no-country-select"
      )
    );
  }

  // --- Country data -----------------------------------------------------------

  private createFallbackCountry(): PhoneCountry {
    return {
      code: "us",
      libraryCode: "US",
      name: "United States",
      dialCode: "1",
      placeholder: "(201) 555-0123",
    };
  }

  private createCountryList(): PhoneCountry[] {
    const intlWithDisplayNames = Intl as typeof Intl & {
      DisplayNames?: DisplayNamesConstructor;
    };
    let displayNames: DisplayNamesInstance | null = null;
    if (intlWithDisplayNames.DisplayNames) {
      try {
        displayNames = new intlWithDisplayNames.DisplayNames(
          [document.documentElement.lang || "en"],
          { type: "region", fallback: "code" }
        );
      } catch (_error) {
        displayNames = null;
      }
    }

    return getCountries()
      .map((libraryCode) => {
        const code = libraryCode.toLowerCase();
        const example = getExampleNumber(libraryCode, examples);
        return {
          code,
          libraryCode,
          name: displayNames?.of(libraryCode) || libraryCode,
          dialCode: getCountryCallingCode(libraryCode),
          placeholder: example?.formatNational() || this.originalPlaceholder,
        };
      })
      .sort((a, b) => {
        const aPriority = PREFERRED_COUNTRY_ORDER[a.code] ?? Infinity;
        const bPriority = PREFERRED_COUNTRY_ORDER[b.code] ?? Infinity;
        return aPriority === bPriority
          ? a.name.localeCompare(b.name)
          : aPriority - bPriority;
      });
  }

  // --- Selector rendering -----------------------------------------------------

  private renderCountrySelector() {
    if (!this.input) return;
    const fieldElement = this.input.closest(".en__field__element");
    if (!(fieldElement instanceof HTMLElement)) return;

    fieldElement.classList.add("e164-phone--enhanced");
    this.input
      .closest(".en__component--formblock")
      ?.classList.add("e164-phone--enhanced-form");

    const computedStyle = window.getComputedStyle(this.input);
    fieldElement.style.setProperty(
      "--e164-phone-margin-top",
      computedStyle.marginTop
    );
    fieldElement.style.setProperty(
      "--e164-phone-margin-bottom",
      computedStyle.marginBottom
    );
    fieldElement.style.setProperty(
      "--e164-phone-font-size",
      computedStyle.fontSize
    );

    const container = document.createElement("div");
    container.className = "e164-phone";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "e164-phone__selected";
    // Select-only combobox pattern; aria-activedescendant isn't supported on a plain button.
    button.setAttribute("role", "combobox");
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "e164-phone-country-list");

    const selectedFlag = document.createElement("span");
    selectedFlag.className = "e164-phone__selected-flag";
    const selectedDialCode = document.createElement("span");
    selectedDialCode.className = "e164-phone__selected-dial-code";
    selectedDialCode.setAttribute("aria-hidden", "true");
    const arrow = document.createElement("span");
    arrow.className = "e164-phone__arrow";
    arrow.setAttribute("aria-hidden", "true");
    button.append(selectedFlag, selectedDialCode, arrow);

    const list = document.createElement("ul");
    list.id = "e164-phone-country-list";
    list.className = "e164-phone__list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Countries and territories");
    list.hidden = true;

    this.countries.forEach((country) => {
      list.appendChild(this.createCountryOption(country));
      if (country.code === "gb") {
        const divider = document.createElement("li");
        divider.className = "e164-phone__divider";
        divider.setAttribute("role", "separator");
        list.appendChild(divider);
      }
    });

    container.append(button, list);
    fieldElement.insertBefore(container, this.input);

    // Dial codes vary from +1 to +998, so the input padding follows the
    // selector's rendered width.
    const ResizeObserverClass = (
      window as Window & { ResizeObserver?: ResizeObserverConstructor }
    ).ResizeObserver;
    if (ResizeObserverClass) {
      new ResizeObserverClass(() => {
        if (!container.offsetWidth) return;
        fieldElement.style.setProperty(
          "--e164-phone-selector-width",
          `${container.offsetWidth}px`
        );
      }).observe(container);
    }

    this.countrySelector = container;
    this.countryButton = button;
    this.countryList = list;
    this.updateSelectedCountryUI();
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

    const picture = document.createElement("picture");
    const webp = document.createElement("source");
    webp.type = "image/webp";
    webp.srcset = `https://flagcdn.com/h20/${country.code}.webp, https://flagcdn.com/h40/${country.code}.webp 2x, https://flagcdn.com/h60/${country.code}.webp 3x`;
    const png = document.createElement("source");
    png.type = "image/png";
    png.srcset = `https://flagcdn.com/h20/${country.code}.png, https://flagcdn.com/h40/${country.code}.png 2x, https://flagcdn.com/h60/${country.code}.png 3x`;
    const image = document.createElement("img");
    image.src = `https://flagcdn.com/h20/${country.code}.png`;
    image.alt = "";
    image.width = 24;
    image.height = 16;
    image.setAttribute("loading", "lazy");
    image.addEventListener("error", () => {
      wrapper.classList.add("e164-phone__flag--failed");
      while (wrapper.firstChild) {
        wrapper.removeChild(wrapper.firstChild);
      }
      wrapper.textContent = country.libraryCode;
    });
    picture.append(webp, png, image);
    wrapper.appendChild(picture);
    return wrapper;
  }

  // --- Event wiring -----------------------------------------------------------

  private addEventListeners() {
    if (!this.input || !this.countryButton || !this.countryList) return;
    this.addInputListeners();
    this.addCountrySelectorListeners();
    this.addSubmissionListeners();
  }

  private addInputListeners() {
    if (!this.input) return;
    // Rewriting the field mid-keystroke moves the cursor, and shared calling
    // codes need the digits after them to settle the country, so typing only
    // updates the flag. The code moves into the selector on paste, autofill
    // or blur.
    this.input.addEventListener("input", (event) => {
      if (this.isSettingDisplayValue) return;
      this.discardPendingSubmission();
      if (this.isTyping(event)) {
        this.updateCountryFromInternationalInput();
      } else {
        this.moveCallingCodeToSelector();
      }
    });
    this.input.addEventListener("change", () => {
      if (this.isSettingDisplayValue) return;
      this.moveCallingCodeToSelector();
    });
  }

  private isTyping(event: Event): boolean {
    return (
      event instanceof InputEvent &&
      Boolean(event.inputType) &&
      !["insertFromPaste", "insertFromDrop", "insertReplacementText"].includes(
        event.inputType
      )
    );
  }

  private addCountrySelectorListeners() {
    if (!this.countryButton || !this.countryList) return;
    const button = this.countryButton;
    const list = this.countryList;

    button.addEventListener("click", () => {
      if (list.hidden) {
        this.openCountrySelector();
      } else {
        this.closeCountrySelector();
      }
    });
    button.addEventListener("keydown", (event) =>
      this.handleSelectorKeydown(event)
    );
    list.addEventListener("mousedown", (event) => {
      // Keep keyboard focus on the selector button while choosing an option.
      event.preventDefault();
    });
    list.addEventListener("click", (event) => {
      const item = (event.target as HTMLElement).closest<HTMLLIElement>(
        "li[data-country-code]"
      );
      const country = this.getCountryByCode(item?.dataset.countryCode);
      if (country) this.selectCountryManually(country);
    });
    document.addEventListener("click", (event) => {
      if (
        !list.hidden &&
        !this.countrySelector?.contains(event.target as Node)
      ) {
        this.closeCountrySelector();
      }
    });
  }

  private addSubmissionListeners() {
    this.form.onIntentSubmit.subscribe(() => this.convertForSubmission());
    this.form.onError.subscribe(this.restoreSubmissionOnError);
    ENGrid.watchForError(this.restoreSubmissionOnError);
  }

  // --- Selector interaction ---------------------------------------------------

  private handleSelectorKeydown(event: KeyboardEvent) {
    if (!this.countryList) return;

    if (this.countryList.hidden) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.openCountrySelector();
      }
      return;
    }

    if (event.key === "Tab") {
      this.closeCountrySelector();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeCountrySelector(true);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (this.highlightedCountry) {
        this.selectCountryManually(this.highlightedCountry);
      }
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      this.moveHighlight(event.key);
      return;
    }
  }

  private openCountrySelector() {
    if (!this.countryList || !this.countryButton) return;
    this.countryList.hidden = false;
    this.countrySelector?.classList.add("e164-phone--open");
    this.countryButton.setAttribute("aria-expanded", "true");
    this.highlightCountry(this.selectedCountry);
  }

  private closeCountrySelector(returnFocus = false) {
    if (!this.countryList || !this.countryButton) return;
    this.countryList.hidden = true;
    this.countrySelector?.classList.remove("e164-phone--open");
    this.countryButton.setAttribute("aria-expanded", "false");
    this.countryButton.removeAttribute("aria-activedescendant");
    if (returnFocus) this.countryButton.focus();
  }

  private moveHighlight(key: string) {
    const currentIndex = this.highlightedCountry
      ? this.countries.indexOf(this.highlightedCountry)
      : this.countries.indexOf(this.selectedCountry);
    let nextIndex = currentIndex;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = this.countries.length - 1;
    if (key === "ArrowDown") {
      nextIndex = Math.min(this.countries.length - 1, currentIndex + 1);
    }
    if (key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
    this.highlightCountry(this.countries[nextIndex]);
  }

  private highlightCountry(country: PhoneCountry | undefined) {
    if (!country || !this.countryList || !this.countryButton) return;
    this.highlightedCountry = country;
    this.countryList
      .querySelectorAll(".e164-phone__country--highlighted")
      .forEach((item) =>
        item.classList.remove("e164-phone__country--highlighted")
      );
    const item = this.countryList.querySelector<HTMLElement>(
      `li[data-country-code="${country.code}"]`
    );
    item?.classList.add("e164-phone__country--highlighted");
    this.countryButton.setAttribute(
      "aria-activedescendant",
      `e164-phone-country-${country.code}`
    );
    item?.scrollIntoView({ block: "nearest" });
  }

  private setSelectedCountry(country: PhoneCountry) {
    const shouldUpdateUI =
      this.countryButton?.dataset.countryCode !== country.code;
    this.selectedCountry = country;
    if (this.input) {
      this.input.placeholder = country.placeholder || this.originalPlaceholder;
    }
    if (shouldUpdateUI) this.updateSelectedCountryUI();
  }

  private updateSelectedCountryUI() {
    if (!this.countryButton || !this.countryList) return;
    this.countryButton.dataset.countryCode = this.selectedCountry.code;
    const selectedFlag = this.countryButton.querySelector(
      ".e164-phone__selected-flag"
    );
    if (selectedFlag) {
      while (selectedFlag.firstChild) {
        selectedFlag.removeChild(selectedFlag.firstChild);
      }
      selectedFlag.appendChild(this.createFlag(this.selectedCountry));
    }
    const selectedDialCode = this.countryButton.querySelector(
      ".e164-phone__selected-dial-code"
    );
    if (selectedDialCode) {
      selectedDialCode.textContent = `+${this.selectedCountry.dialCode}`;
    }
    this.countryButton.setAttribute(
      "aria-label",
      `Select country. Current selection: ${this.selectedCountry.name}, +${this.selectedCountry.dialCode}`
    );
    this.countryButton.title = `Select country (${this.selectedCountry.name})`;
    this.countryList
      .querySelectorAll<HTMLLIElement>("li[data-country-code]")
      .forEach((item) => {
        const selected = item.dataset.countryCode === this.selectedCountry.code;
        item.setAttribute("aria-selected", String(selected));
        item.classList.toggle("e164-phone__country--selected", selected);
      });
  }

  private selectCountryManually(country: PhoneCountry) {
    if (!this.input) return;
    this.discardPendingSubmission();
    this.countryCameFromSupporter = true;
    this.setSelectedCountry(country);
    this.closeCountrySelector();
    this.input.focus();
  }

  // --- Country resolution -----------------------------------------------------

  private isInternational(value: string): boolean {
    return value.trimStart().startsWith("+");
  }

  private extractPhoneValue(value: string): string {
    const firstPhoneCharacter = value.search(/[+\d]/);
    const phoneValue =
      firstPhoneCharacter > 0 ? value.slice(firstPhoneCharacter) : value;
    // 00 is the international prefix in most of the world, but under US/CA
    // libphonenumber would read it as part of a national number.
    return phoneValue.startsWith("00") ? `+${phoneValue.slice(2)}` : phoneValue;
  }

  // The selector is the only place the country shows, so an international
  // number sets the flag and its calling code is removed from the field.
  private moveCallingCodeToSelector() {
    if (!this.input) return;
    const phoneValue = this.extractPhoneValue(this.input.value);
    if (!this.isInternational(phoneValue)) return;

    const formatter = new AsYouType();
    formatter.input(phoneValue);
    const callingCode = formatter.getCallingCode();
    const e164 = formatter.getNumberValue();
    const country = this.resolveInternationalCountry(formatter);
    if (!callingCode || !e164 || !country) return;

    this.countryCameFromSupporter = true;
    this.setSelectedCountry(country);

    const nationalValue = phoneValue
      .trimStart()
      .replace(new RegExp(`^\\+\\s*${callingCode}[\\s.-]*`), "");
    // Keep the code if the rest alone would submit a different number.
    const check = new AsYouType(country.libraryCode);
    check.input(nationalValue);
    if (check.getNumberValue() !== e164) return;

    this.setDisplayValue(nationalValue);
  }

  private updateCountryFromInternationalInput() {
    if (!this.input) return;
    const value = this.extractPhoneValue(this.input.value);
    if (!this.isInternational(value)) return;

    const formatter = new AsYouType();
    formatter.input(value);
    const detectedCountry = this.resolveInternationalCountry(formatter);
    if (detectedCountry) this.setSelectedCountry(detectedCountry);
  }

  private getCountryByCode(
    code: string | null | undefined
  ): PhoneCountry | undefined {
    if (!code) return undefined;
    return this.countries.find(
      (country) => country.code === code.toLowerCase()
    );
  }

  private getCountryByDialCode(
    dialCode: string | null | undefined
  ): PhoneCountry | undefined {
    if (!dialCode) return undefined;
    const primaryCode = PRIMARY_COUNTRY_BY_CALLING_CODE[dialCode];
    return (
      this.getCountryByCode(primaryCode) ||
      this.countries.find((country) => country.dialCode === dialCode)
    );
  }

  private getCompatibleCountry(
    country: PhoneCountry | null | undefined,
    dialCode: string | null | undefined
  ): PhoneCountry | undefined {
    return country && dialCode && country.dialCode === dialCode
      ? country
      : undefined;
  }

  private resolveInternationalCountry(
    formatter: AsYouType
  ): PhoneCountry | undefined {
    const callingCode = formatter.getCallingCode();
    // Unique phone evidence wins; the supporter's own choice, then hints,
    // break shared-code ties.
    return (
      this.getCountryByCode(formatter.getCountry()) ||
      (this.countryCameFromSupporter
        ? this.getCompatibleCountry(this.selectedCountry, callingCode)
        : undefined) ||
      this.getCompatibleCountry(this.supporterCountryHint, callingCode) ||
      this.getCompatibleCountry(this.ipCountry, callingCode) ||
      this.getCountryByDialCode(callingCode)
    );
  }

  private async setCountryFromIp() {
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
      const country = this.getCountryByCode(location);
      if (!country) throw new Error("Unsupported IP country");
      this.ipCountry = country;
      this.applyIpCountry(country);
    } catch (error) {
      this.logger.log("Unable to determine phone country from IP", error);
      const fallback =
        this.getCountryByCode(ENGrid.getFieldValue("supporter.country")) ||
        this.getCountryByCode("us");
      if (fallback) this.applyIpCountry(fallback);
    }
  }

  private applyIpCountry(country: PhoneCountry) {
    if (!this.input || this.countryCameFromSupporter) return;
    const value = this.extractPhoneValue(this.input.value);
    if (this.isInternational(value)) {
      // Re-evaluate international evidence instead of replacing its country.
      const formatter = new AsYouType();
      formatter.input(value);
      const detectedCountry =
        this.resolveInternationalCountry(formatter) || country;
      this.setSelectedCountry(detectedCountry);
      return;
    }

    this.setSelectedCountry(country);
  }

  // --- Submission and restoration ---------------------------------------------

  private getE164Value(displayValue: string): string {
    const value = this.extractPhoneValue(displayValue);
    const international = this.isInternational(value);
    const formatter = international
      ? new AsYouType()
      : new AsYouType(this.selectedCountry.libraryCode);
    formatter.input(value);

    const e164 = formatter.getNumberValue();
    if (e164) return e164;

    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return international
      ? `+${digits}`
      : `+${this.selectedCountry.dialCode}${digits}`;
  }

  private convertForSubmission() {
    if (!this.input) return;
    const displayValue = this.input.value;
    if (!displayValue.trim()) return;
    if (this.pendingSubmission && this.convertedValue === displayValue) {
      return;
    }

    // Preserve the exact display value before writing E.164 for EN.
    this.pendingSubmission = {
      pageId: this.pageId,
      fieldName: this.fieldName,
      displayValue,
      countryCode: this.selectedCountry.code,
    };
    this.savePendingSubmission();

    const e164 = this.getE164Value(displayValue);
    this.input.value = e164;
    this.convertedValue = e164;
    this.logger.log(`Formatted phone for submission: ${e164}`);
  }

  private restoreSubmissionOnError = () => {
    this.restoreDisplayValue();
  };

  private restoreDisplayValue() {
    if (!this.input || !this.pendingSubmission) return;
    const pending = this.pendingSubmission;
    const country = this.getCountryByCode(pending.countryCode);
    if (country) this.setSelectedCountry(country);
    this.countryCameFromSupporter = true;
    this.setDisplayValue(pending.displayValue);
    // A + number submitted with Enter never blurred, so it still has its code.
    this.moveCallingCodeToSelector();
    this.discardPendingSubmission();
    this.logger.log("Restored phone display value after submission error");
  }

  private discardPendingSubmission() {
    this.pendingSubmission = null;
    this.convertedValue = null;
    this.clearSavedSubmission();
  }

  // Notifies other listeners without re-running country detection, which
  // would override a country the component has just chosen.
  private setDisplayValue(value: string) {
    if (!this.input) return;
    this.isSettingDisplayValue = true;
    try {
      this.input.value = value;
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
    } finally {
      this.isSettingDisplayValue = false;
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

  // --- Session storage --------------------------------------------------------

  private savePendingSubmission() {
    if (!this.pendingSubmission) return;
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify(this.pendingSubmission)
      );
    } catch (error) {
      this.logger.log("Unable to save phone display state", error);
    }
  }

  private readSavedSubmission(): PendingSubmission | null {
    try {
      const value = sessionStorage.getItem(this.storageKey);
      if (!value) return null;
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== "object") return null;
      const candidate = parsed as Partial<PendingSubmission>;
      if (
        typeof candidate.pageId !== "string" ||
        typeof candidate.fieldName !== "string" ||
        typeof candidate.displayValue !== "string" ||
        typeof candidate.countryCode !== "string"
      ) {
        return null;
      }
      return candidate as PendingSubmission;
    } catch (error) {
      this.logger.log("Unable to read phone display state", error);
      return null;
    }
  }

  private clearSavedSubmission() {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (_error) {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }
  }
}
