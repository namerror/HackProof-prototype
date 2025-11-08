export function getImageUrl(cid: string): string {
  return `https://${cid}.ipfs.nftstorage.link`;
}

export function getParticipantBadgeUrl(cid: string): string {
  return getImageUrl(cid);
}

export function getProjectPlaceholderUrl(cid: string): string {
  return getImageUrl(cid);
}

