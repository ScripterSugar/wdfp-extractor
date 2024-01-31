import IntMatrix from './intMatrix';

export default class MatrixHashTable {
  static init__: boolean;

  static SIZE: number = 100000;

  static table: IntMatrix[] = [];

  constructor() {}

  static getByFloat(
    param1: number,
    param2: number,
    param3: number,
    param4: number,
    param5: number,
    param6: number
  ): IntMatrix {
    const _loc7_: number = param1 * IntMatrix.RESOLUTION;
    const _loc8_: number = this.floatToInt(_loc7_);
    const _loc9_: number = param2 * IntMatrix.RESOLUTION;
    const _loc10_: number = this.floatToInt(_loc9_);
    const _loc11_: number = param3 * IntMatrix.RESOLUTION;
    const _loc12_: number = this.floatToInt(_loc11_);
    const _loc13_: number = param4 * IntMatrix.RESOLUTION;
    const _loc14_: number = this.floatToInt(_loc13_);
    const _loc15_: number = param5 * IntMatrix.RESOLUTION;
    const _loc16_: number = this.floatToInt(_loc15_);
    const _loc17_: number = param6 * IntMatrix.RESOLUTION;
    const _loc18_: number = this.floatToInt(_loc17_);
    const _loc19_: number =
      1759 +
      _loc8_ * 5360233 +
      _loc10_ * 8417077 +
      _loc12_ * 4323961 +
      _loc14_ * 1764881 +
      _loc16_ * 2337539 +
      _loc18_ * 3257117;
    const _loc20_: number =
      _loc19_ < 0 ? Math.floor(_loc19_ - 1e-10) : Math.floor(_loc19_ + 1e-10);
    const _loc21_: number = Math.abs(_loc20_) % MatrixHashTable.SIZE;
    const _loc22_: IntMatrix = MatrixHashTable.table[_loc21_];

    if (
      _loc22_ &&
      _loc22_.intA === _loc8_ &&
      _loc22_.intB === _loc10_ &&
      _loc22_.intC === _loc12_ &&
      _loc22_.intD === _loc14_ &&
      _loc22_.intTx === _loc16_ &&
      _loc22_.intTy === _loc18_
    ) {
      return _loc22_;
    }

    return (MatrixHashTable.table[_loc21_] = new IntMatrix(
      _loc8_,
      _loc10_,
      _loc12_,
      _loc14_,
      _loc16_,
      _loc18_
    ));
  }

  static get(
    param1: number,
    param2: number,
    param3: number,
    param4: number,
    param5: number,
    param6: number
  ): IntMatrix {
    const _loc7_: number =
      1759 +
      param1 * 5360233 +
      param2 * 8417077 +
      param3 * 4323961 +
      param4 * 1764881 +
      param5 * 2337539 +
      param6 * 3257117;
    const _loc8_: number =
      _loc7_ < 0 ? Math.floor(_loc7_ - 1e-10) : Math.floor(_loc7_ + 1e-10);
    const _loc9_: number = Math.abs(_loc8_) % MatrixHashTable.SIZE;
    const _loc10_: IntMatrix = MatrixHashTable.table[_loc9_];

    if (
      _loc10_ &&
      _loc10_.intA === param1 &&
      _loc10_.intB === param2 &&
      _loc10_.intC === param3 &&
      _loc10_.intD === param4 &&
      _loc10_.intTx === param5 &&
      _loc10_.intTy === param6
    ) {
      return _loc10_;
    }

    return (MatrixHashTable.table[_loc9_] = new IntMatrix(
      param1,
      param2,
      param3,
      param4,
      param5,
      param6
    ));
  }

  static calculateHash(
    param1: number,
    param2: number,
    param3: number,
    param4: number,
    param5: number,
    param6: number
  ): number {
    const _loc7_: number =
      1759 +
      param1 * 5360233 +
      param2 * 8417077 +
      param3 * 4323961 +
      param4 * 1764881 +
      param5 * 2337539 +
      param6 * 3257117;
    const _loc8_: number =
      _loc7_ < 0 ? Math.floor(_loc7_ - 1e-10) : Math.floor(_loc7_ + 1e-10);
    return Math.abs(_loc8_);
  }

  private static floatToInt(param1: number): number {
    if (param1 >= 2147483647) {
      return 2147483647;
    }
    if (param1 <= -2147483648) {
      return -2147483648;
    }
    if (param1 < 0) {
      return Math.floor(param1 - 1e-10);
    }
    return Math.floor(param1 + 1e-10);
  }
}
