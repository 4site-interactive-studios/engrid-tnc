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
    gdcpFieldName: "engrid.gdcp-email", // Don't edit this field
    gdcpFieldHtmlLabel: `<span>I agree to receive email updates from The Nature Conservancy and understand I can unsubscribe at any time.</span>`,
    gdcpFieldHtmlLabelEs: `<span>Acepto recibir noticias e información de The Nature Conservancy por correo electrónico y entiendo que puedo cancelar mi suscripción en cualquier momento.</span>`,
  },
  {
    channel: "mobile_phone",
    dataFieldName: "supporter.phoneNumber2",
    optInFieldNames: [
      "supporter.questions.848527", // Mobile Text Opt In
      "supporter.questions.848528", // Mobile Call Opt In
      "supporter.questions.1952175", // Interested in Mobile Text
      "supporter.questions.2268563", // GDCP Dummy Mobile Phone Opt-In
    ],
    gdcpFieldName: "engrid.gdcp-mobile_phone", // Don't edit this field
    gdcpFieldHtmlLabel: `<span>By entering my mobile phone number and submitting this form, I agree to receive phone and text updates from The Nature Conservancy for the purposes of supporting and promoting its charitable initiatives at the mobile number I entered above. <em>Message & data rates may apply and message frequency varies. Text STOP to opt out or HELP for help.</em> <br> <a href="https://www.nature.org/en-us/about-us/who-we-are/accountability/mobile-terms-and-conditions/" target="_blank">Mobile Terms & Conditions</a> | <a href="https://www.nature.org/en-us/about-us/who-we-are/accountability/privacy-policy/" target="_blank">Privacy Statement</a>.</span>`,
    gdcpFieldHtmlLabelEs: `<span>Al ingresar mi número de teléfono móvil y enviar este formulario, acepto recibir llamadas o mensajes de texto de The Nature Conservancy con el fin de apoyar y promover sus iniciativas benéficas, al número que he proporcionado.<em>Pueden aplicarse tarifas de mensajes y datos, y la frecuencia de los mensajes puede variar. Envía STOP para cancelar o HELP para obtener ayuda.</em> <br> <a href="https://www.nature.org/en-us/about-us/who-we-are/accountability/mobile-terms-and-conditions/" target="_blank">Términos y Condiciones Móviles</a> | <a href="https://www.nature.org/en-us/about-us/who-we-are/accountability/privacy-policy/" target="_blank">Declaración de Privacidad</a>.</span>`,
  },
  {
    channel: "home_phone",
    dataFieldName: "supporter.phoneNumber",
    optInFieldNames: [
      "supporter.questions.894263", // Home Phone Opt In
    ],
    gdcpFieldName: "engrid.gdcp-home_phone", // Don't edit this field
    gdcpFieldHtmlLabel: `<span>I give The Nature Conservancy permission to contact me by phone.</span>`,
    gdcpFieldHtmlLabelEs: `<span>I give The Nature Conservancy permission to contact me by phone.</span>`,
  },
  {
    channel: "postal_mail",
    dataFieldName: "supporter.postcode",
    optInFieldNames: [
      "supporter.questions.1984598", // GDCP Dummy Postal Mail Opt-In
    ],
    gdcpFieldName: "engrid.gdcp-postal_mail", // Don't edit this field
    gdcpFieldHtmlLabel: `<span>The Nature Conservancy can send me updates about its work and other information by mail.</span>`,
    gdcpFieldHtmlLabelEs: `<span>The Nature Conservancy puede enviarme información sobre su trabajo y otras novedades por correo postal.</span>`,
  },
];
