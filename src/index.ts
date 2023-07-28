// import { Options, App } from "@4site/engrid-common"; // Uses ENGrid via NPM
import {
  Options,
  App,
  DonationFrequency,
  DonationAmount,
} from "../../engrid-scripts/packages/common"; // Uses ENGrid via Visual Studio Workspace

import "./sass/main.scss";
import { customScript, dataCaptureTracking } from "./scripts/main";

declare global {
  interface Window {
    donationSettings: {
      minimumDonationAmount: number;
      monthlyPremiumMinimum: number;
      onetimePremiumMinimum: number;
    };
  }
}

const minimumAmount = window.donationSettings.minimumDonationAmount ?? 5;

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
  onLoad: () => customScript(App, DonationFrequency, DonationAmount),
  onSubmit: () => dataCaptureTracking(),
  onResize: () => console.log("Starter Theme Window Resized"),
};
new App(options);
