export default class IntMatrix {
  static RESOLUTION: number = 4096;

  intTy: number;

  intTx: number;

  intD: number;

  intC: number;

  intB: number;

  intA: number;

  constructor(
    param1 = 0,
    param2 = 0,
    param3 = 0,
    param4 = 0,
    param5 = 0,
    param6 = 0
  ) {
    this.intA = param1;
    this.intB = param2;
    this.intC = param3;
    this.intD = param4;
    this.intTx = param5;
    this.intTy = param6;
  }

  static getIdentity(): IntMatrix {
    return new IntMatrix(
      IntMatrix.RESOLUTION,
      0,
      0,
      IntMatrix.RESOLUTION,
      0,
      0
    );
  }

  static floatToInt(param1: number): number {
    let modifiableParam = param1;

    modifiableParam *= IntMatrix.RESOLUTION;
    if (modifiableParam >= 2147483647) {
      return 2147483647;
    }
    if (modifiableParam <= -2147483648) {
      return -2147483648;
    }
    if (modifiableParam < 0) {
      return Math.floor(modifiableParam - 1e-10);
    }
    return Math.floor(modifiableParam + 1e-10);
  }

  get ty(): number {
    return this.intTy / IntMatrix.RESOLUTION;
  }

  get tx(): number {
    return this.intTx / IntMatrix.RESOLUTION;
  }

  get d(): number {
    return this.intD / IntMatrix.RESOLUTION;
  }

  get c(): number {
    return this.intC / IntMatrix.RESOLUTION;
  }

  get b(): number {
    return this.intB / IntMatrix.RESOLUTION;
  }

  get a(): number {
    return this.intA / IntMatrix.RESOLUTION;
  }
}
