/**
 * Seeded players start with a stand-in phone until an admin fills the real one in:
 * 'pending-NN' for real players from the organiser's list, 'placeholder-NN' for made-up ones.
 */
export const isPendingPhone = (phone: string): boolean => phone.startsWith("pending-");

export const isPlaceholderPlayer = (phone: string): boolean => phone.startsWith("placeholder-");

/** True when the stored phone is not a real number yet. */
export const hasNoPhone = (phone: string): boolean => isPendingPhone(phone) || isPlaceholderPlayer(phone);
