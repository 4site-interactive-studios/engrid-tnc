import { EngridLogger } from "@4site/engrid-scripts";

const CONTINUE_YOUR_GIFT_SCRIPT_URL =
  "https://s3.amazonaws.com/engrid-dev.4sitestudios.com/continue-your-gift/main/continue-your-gift.min.js";
const DONATION_LIGHTBOX_SCRIPT_URL =
  "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/donation-lightbox-parent.js";
const DONATION_PAGE_URL = "https://preserve.nature.org/page/198490/donate/1";

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

declare global {
  interface Window {
    ContinueYourGift?: {
      init(config: Record<string, unknown>): ContinueYourGiftHandle;
    };
    ContinueYourGiftRecovery?: ContinueYourGiftHandle;
    DonationLightbox?: new () => { build(url: string): void };
    DonationLightboxOptions?: Record<string, unknown>;
  }
}

export class ContinueYourGift {
  private logger: EngridLogger = new EngridLogger(
    "ContinueYourGift",
    "#007931",
    "white"
  );

  constructor() {
    this.loadScript(
      DONATION_LIGHTBOX_SCRIPT_URL,
      () => typeof window.DonationLightbox === "function"
    );
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
        expandedTitle: "Continue Your Gift",
        message:
          "Complete your ${amount} {frequency} gift to make a difference",
        continue: "I'm ready",
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
      inactivityResetDays: 180,
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
        title: "Continue Your Gift",
        paragraph: "Finish your gift here.",
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
