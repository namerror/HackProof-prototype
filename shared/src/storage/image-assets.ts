export function getImageUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export function getParticipantBadgeUrl(cid: string): string {
  return getImageUrl(cid);
}

export function getProjectPlaceholderUrl(cid: string): string {
  return getImageUrl(cid);
}

