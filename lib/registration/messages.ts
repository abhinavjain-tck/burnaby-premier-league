/** Path of a player's private edit page. */
export const editPath = (token: string): string => `/r/${token}`;

/** Text before the link in the admin "Copy WhatsApp message" button. */
export const whatsappIntro = (name: string): string =>
  `Hi ${name}, you're registered for BPL Season 4. Your private link to edit your auction card: `;
