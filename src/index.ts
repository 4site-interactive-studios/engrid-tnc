import {
  Options,
  App,
  DonationFrequency,
  DonationAmount,
} from "@4site/engrid-scripts"; // Uses ENGrid via NPM
// import {
//   Options,
//   App,
//   DonationFrequency,
//   DonationAmount,
// } from "../../engrid/packages/scripts"; // Uses ENGrid via Visual Studio Workspace

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
import { Tooltip } from "./scripts/tooltip";
import { IHMO } from "./scripts/ihmo";
import { WidgetProgressBar } from "./scripts/widget-progress-bar";
import { GdcpManager } from "./scripts/gdcp/gdcp-manager";
import { AddDAFBanner } from "./scripts/add-daf-banner";
import { Quiz } from "./scripts/quiz";
import { BankAccountAgreementField } from "./scripts/bank-account-agreement-field";
import { GroupQuiz } from "./scripts/group-quiz";

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

  const utag_data: {
    channel: string;
    constituent_id: string;
    en_campaignId: string;
    en_code: string;
    en_page_count: number;
    en_page_number: number;
    en_txn6: string;
    hier1: string;
    locale: string;
    page_category: string;
    page_id: string;
    page_name: string;
    site_group: string;
    site_section: string;
    site_section_2: string;
    site_section_3: string;
    site_section_4: string;
  };
}

const minimumAmount = window?.donationSettings?.minimumDonationAmount ?? 5;

//Allow banner image with attribution using image block
//Also applies to all images with class "img-with-attribution"
//This code is run before the ENgrid script is loaded so that media-attribution.ts will run on this element
const bannerImagesWithAttribution = document.querySelectorAll(
  ".body-banner .en__component--imageblock img[alt], img.img-with-attribution[alt]"
) as NodeListOf<HTMLImageElement>;
bannerImagesWithAttribution.forEach((img) => {
  if (!img.getAttribute("alt")) return;
  img.dataset.attributionSource = "i";
  img.dataset.attributionSourceTooltip =
    img.getAttribute("alt")?.replace("&copy;", "©") ?? "";
});

const options: Options = {
  applePay: false,
  AutoYear: true,
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
  VGS: {
    "transaction.ccnumber": {
      css: {
        "@font-face": {
          "font-family": "Whitney B",
          "font-style": "normal",
          "font-weight": "400",
          "font-display": "swap",
          src: "url(data:application/x-font-woff2;base64,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)",
        },
        "font-family": "Whitney B, sans-serif",
      },
    },
    "transaction.ccvv": {
      css: {
        "@font-face": {
          "font-family": "Whitney B",
          "font-style": "normal",
          "font-weight": "400",
          "font-display": "swap",
          src: "url(data:application/x-font-woff2;base64,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)",
        },
        "font-family": "Whitney B, sans-serif",
      },
    },
  },
  onLoad: () => {
    const gdcp = new GdcpManager();
    customScript(App, DonationFrequency, DonationAmount, gdcp);
    new BequestLightbox();
    new Tooltip();
    new IHMO();
    new Quiz();
    new GroupQuiz();
    trackUrlParams();
    trackProcessingErrors(App);
    trackUserInteractions();
    new WidgetProgressBar();
    new AddDAFBanner();
    new BankAccountAgreementField();
  },
  onSubmit: () => trackFormSubmit(App, DonationAmount),
  onResize: () => console.log("Starter Theme Window Resized"),
  onError: () => trackFormErrors(),
};
new App(options);
