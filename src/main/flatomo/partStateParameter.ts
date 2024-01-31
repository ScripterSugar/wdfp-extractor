import IntMatrix from './intMatrix';

export default class PartStateParameters {
  matrix: IntMatrix;

  colorTransform: number;

  alphaAndBlendMode: number;

  constructor(param1: IntMatrix, param2 = 0, param3 = 0) {
    this.alphaAndBlendMode = param2;
    this.matrix = param1;
    this.colorTransform = param3;
  }

  get intAlpha(): number {
    return this.alphaAndBlendMode & 255;
  }

  get blendMode(): number {
    return this.alphaAndBlendMode >> 8;
  }

  get alpha(): number {
    return (this.alphaAndBlendMode & 255) / 255;
  }
}
