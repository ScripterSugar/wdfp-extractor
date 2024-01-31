import IntMatrix from './intMatrix';
import PartStateParameters from './partStateParameter';

export default class PartStateParametersHashTable {
  static init__: boolean;

  static SIZE: number = 100000;

  static table: PartStateParameters[] = [];

  constructor() {}

  static get(
    param1: IntMatrix,
    param2: number,
    param3: number
  ): PartStateParameters {
    const _loc4_: number =
      1759 +
      param1.intA * 5360233 +
      param1.intB * 8417077 +
      param1.intC * 4323961 +
      param1.intD * 1764881 +
      param1.intTx * 2337539 +
      param1.intTy * 3257117 +
      param2 * 28979 +
      param3 * 178627 +
      99809;
    const _loc5_: number =
      _loc4_ < 0 ? Math.floor(_loc4_ - 1e-10) : Math.floor(_loc4_ + 1e-10);
    const _loc6_: number = Math.abs(_loc5_) % PartStateParametersHashTable.SIZE;
    const _loc7_: PartStateParameters =
      PartStateParametersHashTable.table[_loc6_];
    if (
      _loc7_ &&
      _loc7_.matrix === param1 &&
      _loc7_.alphaAndBlendMode === param2 &&
      _loc7_.colorTransform === param3
    ) {
      return _loc7_;
    }
    return (PartStateParametersHashTable.table[_loc6_] =
      new PartStateParameters(param1, param2, param3));
  }

  static calculateHash(
    param1: IntMatrix,
    param2: number,
    param3: number
  ): number {
    const _loc4_: number =
      1759 +
      param1.intA * 5360233 +
      param1.intB * 8417077 +
      param1.intC * 4323961 +
      param1.intD * 1764881 +
      param1.intTx * 2337539 +
      param1.intTy * 3257117 +
      param2 * 28979 +
      param3 * 178627 +
      99809;
    const _loc5_: number =
      _loc4_ < 0 ? Math.floor(_loc4_ - 1e-10) : Math.floor(_loc4_ + 1e-10);
    return Math.abs(_loc5_);
  }
}
