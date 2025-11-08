export interface IPFSUploadResult {
  cid: string;
  url: string;
}

export interface MetadataUploadParams {
  name: string;
  description: string;
  imageCid?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

