import { App, EngridLogger } from "@4site/engrid-scripts";
import { trackEvent } from "./tracking";

const CONTINUE_YOUR_GIFT_SCRIPT_URL =
  "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/continue-your-gift.min.js";
const DONATION_LIGHTBOX_SCRIPT_URL =
  "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/donation-lightbox-parent.js";
const DONATION_PAGE_URL = "https://preserve.nature.org/page/201350/donate/1";
const ONETRUST_FUNCTIONAL_CATEGORY = "C0003";
// Gift-planning data/survey pages where the recovery prompt must not appear:
const EXCLUDED_PAGE_IDS = [
  76342, 76347, 76350, 84697, 84712, 84719, 84834, 86267, 85518, 143727, 190356,
];

type ContinueYourGiftFrequency =
  | "onetime"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual";

type ContinueYourGiftGift = {
  frequency: ContinueYourGiftFrequency;
  amount: number;
};

type ContinueYourGiftHandle = {
  reevaluate(): void;
};

const TEALIUM_EVENT_NAMES: Record<string, string> = {
  abandonment: "cyg_abandonment",
  impression: "cyg_impression",
  dismissed: "cyg_dismissed",
  restoration: "cyg_restoration",
  "abandonment-invalidated": "cyg_abandonment-invalidated",
  "completion-after-restoration": "cyg_completion",
  "amount-raised-after-restoration": "cyg_revenue",
};

declare global {
  interface Window {
    ContinueYourGift?: {
      init(config: Record<string, unknown>): ContinueYourGiftHandle;
    };
    ContinueYourGiftRecovery?: ContinueYourGiftHandle;
    DonationLightbox?: new () => { build(url: string): void };
    DonationLightboxOptions?: Record<string, unknown>;
    OnetrustActiveGroups?: string;
  }
}

export class ContinueYourGift {
  private logger: EngridLogger = new EngridLogger(
    "ContinueYourGift",
    "#007931",
    "white"
  );

  constructor() {
    if (EXCLUDED_PAGE_IDS.includes(App.getPageID())) {
      this.logger.log("Page is excluded. Not initializing.");
      return;
    }

    // The DonationLightbox script is only loaded in the top frame. It
    // auto-instantiates on window load and auto-builds a lightbox whenever
    // DonationLightboxOptions.url is present, so loading it inside an iframe
    // (e.g. the lightbox's own donation page, which runs this same bundle)
    // makes lightboxes nest recursively. The Continue Your Gift module itself
    // must still load in iframes: there it acts as the child reporter that
    // tells the top frame about gift captures and completions.
    if (!this.isEmbedded()) {
      this.loadScript(
        DONATION_LIGHTBOX_SCRIPT_URL,
        () => typeof window.DonationLightbox === "function"
      );
    }
    this.loadModuleWhenConsented();

    window.addEventListener("continue-your-gift:lifecycle", ((
      event: CustomEvent
    ) => {
      const detail = event.detail || {};
      const eventName = TEALIUM_EVENT_NAMES[detail.type];
      if (!eventName) return;
      const eventData: Record<string, unknown> = {
        timestamp: detail.timestamp,
      };
      if (detail.type === "amount-raised-after-restoration") {
        eventData.amount = detail.amount;
      }
      trackEvent(eventName, eventData);
    }) as EventListener);
  }

  /**
   * Load the Continue Your Gift module only after OneTrust reports consent
   * for functional cookies (category C0003). OnetrustActiveGroups holds the
   * active category IDs (e.g. ",C0001,C0003,"); OneTrustGroupsUpdated fires
   * whenever consent is granted or changed. Without consent the module never
   * loads, keeping its first-party cookies from being set.
   */
  private loadModuleWhenConsented(): void {
    if (this.hasFunctionalConsent()) {
      this.loadModule();
      return;
    }
    this.logger.log(
      `Waiting for OneTrust functional cookie consent (${ONETRUST_FUNCTIONAL_CATEGORY}).`
    );
    const onGroupsUpdated = () => {
      if (this.hasFunctionalConsent()) {
        window.removeEventListener("OneTrustGroupsUpdated", onGroupsUpdated);
        this.loadModule();
      }
    };
    window.addEventListener("OneTrustGroupsUpdated", onGroupsUpdated);
  }

  private isEmbedded(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  private hasFunctionalConsent(): boolean {
    return (
      typeof window.OnetrustActiveGroups === "string" &&
      window.OnetrustActiveGroups.split(",").includes(
        ONETRUST_FUNCTIONAL_CATEGORY
      )
    );
  }

  private loadModule(): void {
    this.loadScript(
      CONTINUE_YOUR_GIFT_SCRIPT_URL,
      () => typeof window.ContinueYourGift !== "undefined"
    )
      .then(() => this.init())
      .catch(() => {
        this.logger.log("Failed to load the Continue Your Gift script.");
      });
  }

  /**
   * Inject a script tag unless the script is already on the page (by URL or
   * by the global it defines). Resolves once the script has loaded, or
   * immediately if it was already present.
   */
  private loadScript(src: string, isLoaded: () => boolean): Promise<void> {
    if (isLoaded()) {
      return Promise.resolve();
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject());
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => reject());
      document.head.appendChild(script);
    });
  }

  private init(): void {
    if (!window.ContinueYourGift) {
      this.logger.log("Continue Your Gift script not available.");
      return;
    }

    window.ContinueYourGiftRecovery = window.ContinueYourGift.init({
      enabled: () => true,
      continueGift: (gift: ContinueYourGiftGift) => this.continueGift(gift),
      sharedDomain: "nature.org",
      acceptedOrigins: ["https://preserve.nature.org"],
      layout: "compact",
      position: "bottom-right",
      labels: {
        expandedTitle: "Don’t let your impact stop here",
        message:
          "Don’t let your impact stop here. Complete your ${amount} {frequency} gift now.",
        continue: "Make my gift",
        dismiss: "Not now",
      },
      colors: {
        background: "#ffffff",
        text: "#1a1a1a",
        continueButtonBackground: "#007931",
        continueButtonText: "#ffffff",
        continueButtonBorder: "#007931",
        dismissButtonBackground: "#ffffff",
        dismissButtonText: "#1a1a1a",
        dismissButtonBorder: "#949494",
      },
      fontFamily: "Inter, system-ui, sans-serif",
      onError: ({ code }: { code: string }) => {
        console.log(code);
      },
      reopenSuppressionHours: 24,
      dismissalCooldownHours: 168,
      completionSuppressionHours: 720,
      displayCap: 6,
      inactivityResetDays: 30,
    });

    this.logger.log("Initialized.");
  }

  private async continueGift({
    frequency,
    amount,
  }: ContinueYourGiftGift): Promise<void> {
    if (!window.DonationLightbox) {
      this.logger.log("Donation Lightbox script not available.");
      return;
    }

    const hadGlobalOptions = "DonationLightboxOptions" in window;
    const originalOptions = window.DonationLightboxOptions;

    try {
      window.DonationLightboxOptions = {
        title: "PROTECT NATURE TODAY",
        paragraph: `Your gift helps protect wildlife, conserve lands and waters, and advance solutions to the challenges facing our natural world. Together, we can create a healthier future for people and nature. <br><br><strong>FREE! Get 1 year of the award winning Nature Conservancy Magazine with membership.</strong><br><br><img alt="Nature Conservancy magazine cover." class="emailImage" data-ratio-lock="true" data-unit="px" height="130" src="https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/nature_mag_slice.png?v=1612306897000" style="float: left; height: 130px; width: 98px; padding-right: 15px; padding-bottom: 10px;" width="98" />`,
        mobile_enabled: true,
        image:
          "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/202210-givingTuesday-PaidSearch.jpg?v=1664310768000",
        footer:
          "The Nature Conservancy is a nonprofit, tax-exempt charitable organization (tax identification number 53-0242652) under Section 501(c)(3) of the Internal Revenue Code. Donations are tax-deductible as allowed by law.",
      };

      for (const lightbox of document.querySelectorAll(
        ".foursiteDonationLightbox.is-hidden"
      )) {
        lightbox.remove();
      }

      const lightbox = new window.DonationLightbox();
      const url = new URL(DONATION_PAGE_URL);

      url.searchParams.set("transaction.recurrfreq", frequency.toUpperCase());
      url.searchParams.set(
        "transaction.recurrpay",
        frequency === "onetime" ? "N" : "Y"
      );
      url.searchParams.set("transaction.donationAmt", amount.toString());

      lightbox.build(url.toString());
    } finally {
      if (hadGlobalOptions) {
        window.DonationLightboxOptions = originalOptions;
      } else {
        delete window.DonationLightboxOptions;
      }
    }
  }
}
