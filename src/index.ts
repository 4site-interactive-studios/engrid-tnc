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

//Allow banner image with attribution using image block
//This code is run before the ENgrid script is loaded so that media-attribution.ts will run on this element
const bannerImageWithAttribution = document.querySelector(
  ".body-banner .en__component--imageblock img[alt]"
) as HTMLElement;
if (
  bannerImageWithAttribution &&
  bannerImageWithAttribution.getAttribute("alt")
) {
  bannerImageWithAttribution.dataset.attributionSource = "i";
  bannerImageWithAttribution.dataset.attributionSourceTooltip =
    bannerImageWithAttribution.getAttribute("alt") ?? "";
}

const placeholderStyles = {
  color: getComputedStyle(document.body).getPropertyValue(
    "--input_placeholder-color"
  ),
  opacity: getComputedStyle(document.body).getPropertyValue(
    "--input_placeholder-opacity"
  ),
  fontWeight: getComputedStyle(document.body).getPropertyValue(
    "--input_placeholder-font-weight"
  ),
};

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
      showCardIcon: true,
      placeholder: "•••• •••• •••• ••••",
      icons: {
        cardPlaceholder:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEwAAABMCAYAAADHl1ErAAAACXBIWXMAABYlAAAWJQFJUiTwAAAB8ElEQVR4nO2c4W3CMBBGz1H/NyNkAzoCo2SDrkI3YJSOABt0g9IJXBnOqUkMyifUqkrek04RlvMjT2c7sc6EGKPBfBpcaSBMBGEiCBNBmAjCRBAmgjARhIkgTARhIggTQZhK2q0Yh5l1ZrYzs0PqsrI4+LN3VTeThkvntUm6Fbuxn2E/LITQmtm7mW08Sb/MbO9tpxhjui6WEMLWzJKDdO3N7Nmf9ZjaYoyn8y8X1o6GXxLV1lJyDeE+9oWPQ/ZRG4b9WkVVpqe+8LLLo7ErM6t248qllZnWBc+uV5+zumGsQjm3f/ic9tb4JGeeXcga4U723rptilVx0avgg2Q3m/JNn+y6zeAm+GSWUi/c7L5yfB77RJhACOHs6WnuLfmGpTI3YditEEGYCMJEECaCMJHZqySvHRfIMBGEiSBMBGEiCBNBmAjCRBAmgjARhIkgTGT2t+R/59EdYXZcfwmEiSBMBGEiCBNZzCr5VzvCZJjIIMxrPKFC6abMsHbaFcZuGq8StqKwDqZkN8emKBbrvawHCtxJ7y1nVxQF34lxUXBupOy8EtWy88jBhknUDjbkPhyd+Xn2l9lHZ8rgcNZVTA5nTYRFjv/dPf7HvzuJ8C0pgjARhIkgTARhIggTQZgIwkQQJoIwEYSJIEwEYQpm9g2Ro5zhLcuLBwAAAABJRU5ErkJggg==",
      },
      css: {
        "&::placeholder": placeholderStyles,
      },
    },
    "transaction.ccvv": {
      showCardIcon: false,
      placeholder: "CVV",
      hideValue: false,
      css: {
        "&::placeholder": placeholderStyles,
      },
    },
  },
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
