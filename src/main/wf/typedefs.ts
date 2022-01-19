export type LSResult = {
  permission: string;
  linkCount: string;
  owner: string;
  group: string;
  size: string;
  modifiedDate: string;
  name: string;
  path: string;
};

export type WFExtractorMetaData = {
  lastExtractionDate: string;
  lastPackageVersion: string;
  lastSwfChecksum: string;
  lastSwfMode: 'full' | 'simple';
  spriteProcessedLock: string[];
  specialSpriteProcessedLock: string[];
  lockedHashMap: boolean;
};
