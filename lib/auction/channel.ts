/** Realtime channel for one auction. The server broadcasts to it; phones subscribe. */
export const channelName = (auctionId: string): string => `auction:${auctionId}`;
