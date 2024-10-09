import { GdcpField } from "../interfaces/gdcp-field.interface";

export const gdcpFields: GdcpField[] = [
  {
    channel: "email",
    dataFieldName: "supporter.emailAddress",
    optInFieldNames: [
      "supporter.questions.848518", // Stay Informed - Nature News
      "supporter.questions.848520", // 	Get Involved - Advocacy
      "supporter.questions.848521", // Get Involved - Events
      "supporter.questions.848522", // 	Get Involved - Membership
      "supporter.questions.848523", // Get Involved - Volunteer
    ],
    gdcpFieldName: "engrid.gdcp-email",
    gdcpFieldHtmlLabel: `<span>I agree to receive email updates from The Nature Conservancy and understand I can unsubscribe at any time.</span>`,
  },
  {
    channel: "mobile_phone",
    dataFieldName: "supporter.phoneNumber2",
    optInFieldNames: [
      "supporter.questions.1107654", // Permission to Contact Me
      "supporter.questions.848527", // Mobile Text Opt In
      "supporter.questions.848528", // Mobile Call Opt In
      "supporter.questions.1952175", // Interested in Mobile Text
    ],
    gdcpFieldName: "engrid.gdcp-mobile_phone",
    gdcpFieldHtmlLabel: `<span>I’d like to receive phone and text updates from The Nature Conservancy and understand I can unsubscribe at any time. <em>Message & data rates may apply and message frequency varies. Text STOP to opt out or HELP for help.</em> <br> <a href="#" target="_blank">Mobile Terms & Conditions</a> | <a href="#" target="_blank">Privacy Statement</a>.</span>`,
  },
  {
    channel: "home_phone",
    dataFieldName: "supporter.phoneNumber",
    optInFieldNames: [
      "supporter.questions.894263", // Home Phone Opt In
    ],
    gdcpFieldName: "engrid.gdcp-home_phone",
    gdcpFieldHtmlLabel: `<span>I give The Nature Conservancy permission to contact me by phone.</span>`,
  },
  {
    channel: "postal_mail",
    dataFieldName: "supporter.postcode",
    optInFieldNames: [
      "supporter.questions.1984598", // GDCP Dummy Postal Mail Opt-In
    ],
    gdcpFieldName: "engrid.gdcp-postal_mail",
    gdcpFieldHtmlLabel: `<span>The Nature Conservancy can send me updates about its work and other information by mail.</span>`,
  },
];
