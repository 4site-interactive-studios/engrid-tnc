declare module "./scripts/donation-lightbox-form.js" {
  import {
    DonationAmount,
    DonationFrequency,
    App,
  } from "@4site/engrid-scripts";

  export default class DonationLightboxForm {
    constructor(
      donationAmount: DonationAmount,
      donationFrequency: DonationFrequency,
      app: App
    );
  }
}
