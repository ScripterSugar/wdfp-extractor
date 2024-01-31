import GraphicsSource from './graphicsSource';
import IntMatrix from './intMatrix';
import MatrixHashTable from './matrixHashTable';

export default class PartsAnimationSource {
  defaultScale: number;

  imageMaxNumbers: number;

  movieMaxNumbers: number;

  metaData: Record<string, any>;

  images: any[];

  graphics: GraphicsSource[] = [];

  constructor(parts: Record<string, any>) {
    this.defaultScale = parts.s;
    this.imageMaxNumbers = parts.a;
    this.movieMaxNumbers = parts.o;
    this.metaData = parts.f;
    const parsedMatrices = PartsAnimationSource.parseMatrix(parts);
    this.images = parts.i;

    this.parseGraphics(parts, parsedMatrices);
  }

  static parseMatrix(param1: any): IntMatrix[] {
    const _loc2_: number = param1.t.length;
    const _loc3_: IntMatrix[] = new Array<IntMatrix>(_loc2_);
    for (let _loc4_ = 0; _loc4_ < _loc2_; _loc4_++) {
      const _loc6_ = param1.t[_loc4_];
      const _loc7_: number = _loc6_.a;
      const _loc8_: number = _loc6_.b;
      const _loc9_: number = _loc6_.c;
      const _loc10_: number = _loc6_.d;
      const _loc11_: number = _loc6_.x;
      const _loc12_: number = _loc6_.y;
      const _loc13_: number =
        1759 +
        _loc7_ * 5360233 +
        _loc8_ * 8417077 +
        _loc9_ * 4323961 +
        _loc10_ * 1764881 +
        _loc11_ * 2337539 +
        _loc12_ * 3257117;
      const _loc14_: number =
        _loc13_ < 0 ? Math.floor(_loc13_ - 1e-10) : Math.floor(_loc13_ + 1e-10);
      const _loc15_: number = Math.abs(_loc14_) % MatrixHashTable.SIZE;
      const _loc16_: IntMatrix = MatrixHashTable.table[_loc15_];
      _loc3_[_loc4_] =
        _loc16_ &&
        _loc16_.intA === _loc7_ &&
        _loc16_.intB === _loc8_ &&
        _loc16_.intC === _loc9_ &&
        _loc16_.intD === _loc10_ &&
        _loc16_.intTx === _loc11_ &&
        _loc16_.intTy === _loc12_
          ? _loc16_
          : (MatrixHashTable.table[_loc15_] = new IntMatrix(
              _loc7_,
              _loc8_,
              _loc9_,
              _loc10_,
              _loc11_,
              _loc12_
            ));
    }
    return _loc3_;
  }

  parseGraphics(parts: Record<string, any>, matrices: IntMatrix[]): void {
    for (const graphicDescriber of parts.g) {
      const graphic = new GraphicsSource(
        graphicDescriber.s,
        graphicDescriber.t,
        matrices,
        parts.g
      );
      this.graphics.push(graphic);
    }
  }
}
