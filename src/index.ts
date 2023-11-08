import {
  Options,
  App,
  DonationFrequency,
  DonationAmount,
} from "@4site/engrid-common"; // Uses ENGrid via NPM
// import {
//   Options,
//   App,
//   DonationFrequency,
//   DonationAmount,
// } from "../../engrid-scripts/packages/common"; // Uses ENGrid via Visual Studio Workspace

import "./sass/main.scss";
import { customScript } from "./scripts/main";
import {
  trackFormSubmit,
  trackUrlParams,
  trackFormErrors,
  trackProcessingErrors,
  trackUserInteractions,
} from "./scripts/tracking";
import { BequestLightbox } from "./scripts/bequest-lightbox";

declare global {
  interface Window {
    donationSettings: {
      minimumDonationAmount: number;
      monthlyPremiumMinimum: number;
      onetimePremiumMinimum: number;
    };
    bequestUserProfile: {
      crmConstituency?: string;
      doNotSendSolicitations?: string;
      includeInPlannedGivingSolicitations?: string;
      plannedGiftProspect?: string;
      totalNumberOfGifts?: string;
    };
  }
}

const minimumAmount = window?.donationSettings?.minimumDonationAmount ?? 5;

const options: Options = {
  applePay: false,
  CapitalizeFields: true,
  ClickToExpand: true,
  CurrencySymbol: "$",
  DecimalSeparator: ".",
  ThousandsSeparator: ",",
  MediaAttribution: true,
  SkipToMainContentLink: true,
  SrcDefer: true,
  ProgressBar: true,
  Debug: App.getUrlParameter("debug") == "true",
  MinAmount: minimumAmount,
  MaxAmount: 50000,
  MinAmountMessage: `Your donation must be between $${minimumAmount} and $50,000`,
  MaxAmountMessage: `Your donation must be between $${minimumAmount} and $50,000`,
  PageLayouts: ["centercenter1col"],
  TranslateFields: false,
  onLoad: () => {
    customScript(App, DonationFrequency, DonationAmount);
    new BequestLightbox();
    trackUrlParams();
    trackProcessingErrors(App);
    trackUserInteractions();
  },
  onSubmit: () => trackFormSubmit(App, DonationAmount),
  onResize: () => console.log("Starter Theme Window Resized"),
  onError: () => trackFormErrors(),
};
new App(options);
