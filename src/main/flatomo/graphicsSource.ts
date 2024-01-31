import GraphicsLoopKindTools from './graphicsLoopKindTools';
import IntMatrix from './intMatrix';
import MatrixHashTable from './matrixHashTable';
import PartState from './partState';
import PartStateParameters from './partStateParameter';
import PartStateParametersHashTable from './partStateParameterHashTable';

export default class GraphicsSource {
  static init__: boolean;

  static identityMatrix: IntMatrix;

  totalFrame: number;

  frames: PartStateParameters[];

  constructor(
    param1: any[] = undefined,
    param2 = 0,
    param3: IntMatrix[] = undefined,
    param5: any[] = undefined
  ) {
    this.totalFrame = param2;
    this.frames = new Array<PartState>(param2);
    this.addSegments(param1, param3, param5);
  }

  static isSameParts(param1: any[], param2: any[]): boolean {
    if (param1 === null || param2 === null) {
      return param1 === param2;
    }
    if (param1.length !== param2.length) {
      return false;
    }
    for (let i = 0; i < param1.length; i++) {
      if (param1[i] !== param2[i]) {
        return false;
      }
    }
    return true;
  }

  static createPartState(
    param1: any,
    param2: IntMatrix[]
  ): PartStateParameters {
    const _loc3_: IntMatrix = param2[param1.m >>> 12];
    const _loc4_: number = param1.m & 4095;
    const _loc5_: number = param1.c != null ? param1.c : 1677721600;
    const _loc6_: number =
      1759 +
      _loc3_.intA * 5360233 +
      _loc3_.intB * 8417077 +
      _loc3_.intC * 4323961 +
      _loc3_.intD * 1764881 +
      _loc3_.intTx * 2337539 +
      _loc3_.intTy * 3257117 +
      _loc4_ * 28979 +
      _loc5_ * 178627 +
      99809;
    const _loc7_: number =
      _loc6_ < 0 ? Math.floor(_loc6_ - 1e-10) : Math.floor(_loc6_ + 1e-10);
    const _loc8_: number = Math.abs(_loc7_) % PartStateParametersHashTable.SIZE;
    const _loc9_: PartStateParameters =
      PartStateParametersHashTable.table[_loc8_];
    if (
      _loc9_ &&
      _loc9_.matrix === _loc3_ &&
      _loc9_.alphaAndBlendMode === _loc4_ &&
      _loc9_.colorTransform === _loc5_
    ) {
      return _loc9_;
    }
    return (PartStateParametersHashTable.table[_loc8_] =
      new PartStateParameters(_loc3_, _loc4_, _loc5_));
  }

  static _createPartStateParameters(
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

  static resolvePartStates(
    param1: any,
    param2: IntMatrix[],
    param3: CustomTweenRecord[],
    param4: Function
  ): void {
    let _loc9_: number;
    let _loc10_: any;
    let _loc11_: number;
    let _loc12_: any;
    let _loc13_: IntMatrix;
    let _loc14_: number;
    let _loc15_: number;
    let _loc16_: number;
    let _loc17_: number;
    let _loc18_: number;
    let _loc19_: PartStateParameters;
    let _loc20_: PartStateParameters;
    let _loc21_: PartStateParameters;
    let _loc22_: number;
    let _loc23_: number;
    let _loc24_: any;
    let _loc25_: number;
    let _loc26_: IntMatrix;
    let _loc27_: IntMatrix;
    let _loc28_: number;
    let _loc29_: number;
    let _loc30_: number;
    let _loc31_: number;
    let _loc32_: number;
    let _loc33_: number;
    let _loc34_: number;
    let _loc35_: number;
    let _loc36_: number;
    let _loc37_: number;
    let _loc38_: number;
    let _loc39_: number;
    let _loc40_: boolean;
    let _loc41_: number;
    let _loc42_: number;
    let _loc43_: number;
    let _loc44_: number;
    let _loc45_: number;
    let _loc46_: boolean;
    let _loc47_: number;
    let _loc48_: number;
    let _loc49_: number;
    let _loc50_: number;
    let _loc51_: number;
    let _loc52_: number;
    let _loc53_: number;
    let _loc54_: number;
    let _loc55_: number;
    let _loc56_: any;
    let _loc57_: number;
    let _loc58_: number;
    let _loc59_: number;
    let _loc60_: number;
    let _loc61_: IntMatrix;
    let _loc62_: number;
    let _loc63_: number;
    let _loc64_: number;
    let _loc65_: number;
    let _loc66_: number;
    let _loc67_: number;
    let _loc68_: number;
    let _loc69_: number;
    let _loc70_: number;
    let _loc71_: number;
    let _loc72_: number;
    let _loc73_: number;
    let _loc74_: number;
    let _loc75_: number;
    let _loc76_: number;
    let _loc77_: number;
    let _loc78_: IntMatrix;
    let _loc79_: IntMatrix;
    let _loc80_: PartStateParameters;
    let _loc81_: PartStateParameters;
    let _loc5_ = 0;
    const _loc6_: any[] = param1.l;
    let _loc7_ = 0;
    const _loc8_: number = _loc6_.length;
    while (_loc7_ < _loc8_) {
      _loc9_ = _loc7_++;
      _loc10_ = _loc6_[_loc9_];
      _loc11_ = _loc5_;
      _loc12_ =
        _loc10_.t == null
          ? null
          : (_loc10_.t & 65535) != null
          ? _loc10_.t & 65535
          : 1;
      _loc5_ += _loc12_;
      _loc13_ = param2[_loc10_.m >>> 12];
      _loc14_ = _loc10_.m & 4095;
      _loc15_ = _loc10_.c != null ? _loc10_.c : 1677721600;
      _loc16_ =
        1759 +
        _loc13_.intA * 5360233 +
        _loc13_.intB * 8417077 +
        _loc13_.intC * 4323961 +
        _loc13_.intD * 1764881 +
        _loc13_.intTx * 2337539 +
        _loc13_.intTy * 3257117 +
        _loc14_ * 28979 +
        _loc15_ * 178627 +
        99809;
      _loc17_ =
        _loc16_ < 0 ? Math.floor(_loc16_ - 1e-10) : Math.floor(_loc16_ + 1e-10);
      _loc18_ = Math.abs(_loc17_) % PartStateParametersHashTable.SIZE;
      _loc19_ = PartStateParametersHashTable.table[_loc18_];
      _loc20_ =
        _loc19_ != null &&
        _loc19_.matrix == _loc13_ &&
        _loc19_.alphaAndBlendMode == _loc14_ &&
        _loc19_.colorTransform == _loc15_
          ? _loc19_
          : (PartStateParametersHashTable.table[_loc18_] =
              new PartStateParameters(_loc13_, _loc14_, _loc15_));
      _loc22_ = (_loc10_.t >> 16) & 3;
      _loc23_ = _loc22_;
      if (_loc23_ != 0) {
        param4(_loc10_, _loc20_, _loc11_, 0);
        _loc24_ = _loc6_[_loc9_ + 1];
        _loc25_ = (_loc24_.m & 4095 & 255) / 255;
        _loc26_ = param2[_loc10_.m >>> 12];
        _loc27_ = param2[_loc24_.m >>> 12];
        _loc28_ = _loc26_.intA / IntMatrix.RESOLUTION;
        _loc29_ = _loc26_.intB / IntMatrix.RESOLUTION;
        _loc30_ = _loc26_.intC / IntMatrix.RESOLUTION;
        _loc31_ = _loc26_.intD / IntMatrix.RESOLUTION;
        _loc32_ = _loc26_.intTx / IntMatrix.RESOLUTION;
        _loc33_ = _loc26_.intTy / IntMatrix.RESOLUTION;
        _loc34_ = _loc27_.intA / IntMatrix.RESOLUTION;
        _loc35_ = _loc27_.intB / IntMatrix.RESOLUTION;
        _loc36_ = _loc27_.intC / IntMatrix.RESOLUTION;
        _loc37_ = _loc27_.intD / IntMatrix.RESOLUTION;
        _loc38_ = _loc27_.intTx / IntMatrix.RESOLUTION;
        _loc39_ = _loc27_.intTy / IntMatrix.RESOLUTION;
        _loc40_ =
          _loc28_ == _loc34_ &&
          _loc29_ == _loc35_ &&
          _loc30_ == _loc36_ &&
          _loc31_ == _loc37_ &&
          _loc32_ == _loc38_ &&
          _loc33_ == _loc39_;
        _loc41_ = DurationValues_Impl_.get_easingValue(_loc10_.t);
        _loc42_ = _loc41_ / 100;
        _loc43_ = (_loc20_.alphaAndBlendMode & 255) / 255;
        _loc44_ = _loc20_.colorTransform;
        _loc45_ = _loc24_.c != null ? _loc24_.c : 1677721600;
        _loc46_ = _loc44_ == _loc45_;
        _loc47_ = (_loc44_ >> 24) & 255;
        _loc48_ = (_loc44_ >> 16) & 255;
        _loc49_ = (_loc44_ >> 8) & 255;
        _loc50_ = _loc44_ & 255;
        _loc51_ = (_loc45_ >> 24) & 255;
        _loc52_ = (_loc45_ >> 16) & 255;
        _loc53_ = (_loc45_ >> 8) & 255;
        _loc54_ = _loc45_ & 255;
        _loc55_ = 1;
        _loc56_ = _loc12_;
        while (_loc55_ < _loc56_) {
          _loc57_ = _loc55_++;
          _loc58_ = _loc57_ / _loc12_;
          _loc59_ =
            _loc23_ == 2
              ? _loc42_ == 0
                ? _loc58_
                : _loc42_ < 0
                ? _loc58_ * (_loc58_ * -_loc42_ + (1 + _loc42_))
                : _loc58_ * ((2 - _loc58_) * _loc42_ + (1 - _loc42_))
              : 1;
          _loc60_ = _loc43_ * (1 - _loc59_) + _loc25_ * _loc59_;
          if (_loc40_) {
            _loc61_ = _loc26_;
          } else {
            _loc62_ = 1 - _loc59_;
            _loc63_ = _loc28_ * _loc62_ + _loc34_ * _loc59_;
            _loc63_ *= IntMatrix.RESOLUTION;
            _loc64_ =
              _loc63_ >= 2147483647
                ? 2147483647
                : _loc63_ <= -2147483648
                ? -2147483648
                : _loc63_ < 0
                ? Math.floor(_loc63_ - 1e-10)
                : Math.floor(_loc63_ + 1e-10);
            _loc65_ = _loc29_ * _loc62_ + _loc35_ * _loc59_;
            _loc65_ *= IntMatrix.RESOLUTION;
            _loc66_ =
              _loc65_ >= 2147483647
                ? 2147483647
                : _loc65_ <= -2147483648
                ? -2147483648
                : _loc65_ < 0
                ? Math.floor(_loc65_ - 1e-10)
                : Math.floor(_loc65_ + 1e-10);
            _loc67_ = _loc30_ * _loc62_ + _loc36_ * _loc59_;
            _loc67_ *= IntMatrix.RESOLUTION;
            _loc68_ =
              _loc67_ >= 2147483647
                ? 2147483647
                : _loc67_ <= -2147483648
                ? -2147483648
                : _loc67_ < 0
                ? Math.floor(_loc67_ - 1e-10)
                : Math.floor(_loc67_ + 1e-10);
            _loc69_ = _loc31_ * _loc62_ + _loc37_ * _loc59_;
            _loc69_ *= IntMatrix.RESOLUTION;
            _loc70_ =
              _loc69_ >= 2147483647
                ? 2147483647
                : _loc69_ <= -2147483648
                ? -2147483648
                : _loc69_ < 0
                ? Math.floor(_loc69_ - 1e-10)
                : Math.floor(_loc69_ + 1e-10);
            _loc71_ = _loc32_ * _loc62_ + _loc38_ * _loc59_;
            _loc71_ *= IntMatrix.RESOLUTION;
            _loc72_ =
              _loc71_ >= 2147483647
                ? 2147483647
                : _loc71_ <= -2147483648
                ? -2147483648
                : _loc71_ < 0
                ? Math.floor(_loc71_ - 1e-10)
                : Math.floor(_loc71_ + 1e-10);
            _loc73_ = _loc33_ * _loc62_ + _loc39_ * _loc59_;
            _loc73_ *= IntMatrix.RESOLUTION;
            _loc74_ =
              _loc73_ >= 2147483647
                ? 2147483647
                : _loc73_ <= -2147483648
                ? -2147483648
                : _loc73_ < 0
                ? Math.floor(_loc73_ - 1e-10)
                : Math.floor(_loc73_ + 1e-10);
            _loc75_ =
              1759 +
              _loc64_ * 5360233 +
              _loc66_ * 8417077 +
              _loc68_ * 4323961 +
              _loc70_ * 1764881 +
              _loc72_ * 2337539 +
              _loc74_ * 3257117;
            _loc76_ =
              _loc75_ < 0
                ? Math.floor(_loc75_ - 1e-10)
                : Math.floor(_loc75_ + 1e-10);
            _loc77_ = Math.abs(_loc76_) % MatrixHashTable.SIZE;
            _loc78_ = MatrixHashTable.table[_loc77_];
            _loc61_ =
              _loc78_ != null &&
              _loc78_.intA == _loc64_ &&
              _loc78_.intB == _loc66_ &&
              _loc78_.intC == _loc68_ &&
              _loc78_.intD == _loc70_ &&
              _loc78_.intTx == _loc72_ &&
              _loc78_.intTy == _loc74_
                ? _loc78_
                : (MatrixHashTable.table[_loc77_] = new IntMatrix(
                    _loc64_,
                    _loc66_,
                    _loc68_,
                    _loc70_,
                    _loc72_,
                    _loc74_
                  ));
          }
          if (_loc46_) {
            _loc64_ = _loc44_;
          } else {
            _loc62_ = 1 - _loc59_;
            _loc63_ = _loc47_ * _loc62_ + _loc51_ * _loc59_;
            _loc65_ = _loc48_ * _loc62_ + _loc52_ * _loc59_;
            _loc67_ = _loc49_ * _loc62_ + _loc53_ * _loc59_;
            _loc69_ = _loc50_ * _loc62_ + _loc54_ * _loc59_;
            _loc66_ =
              (((_loc63_ < 0
                ? Math.floor(_loc63_ - 1e-10)
                : Math.floor(_loc63_ + 1e-10)) &
                255) <<
                24) |
              (((_loc65_ < 0
                ? Math.floor(_loc65_ - 1e-10)
                : Math.floor(_loc65_ + 1e-10)) &
                255) <<
                16) |
              (((_loc67_ < 0
                ? Math.floor(_loc67_ - 1e-10)
                : Math.floor(_loc67_ + 1e-10)) &
                255) <<
                8) |
              ((_loc69_ < 0
                ? Math.floor(_loc69_ - 1e-10)
                : Math.floor(_loc69_ + 1e-10)) &
                255);
            _loc64_ = _loc66_;
          }
          _loc66_ = _loc20_.alphaAndBlendMode >> 8;
          _loc62_ = _loc60_ * 255;
          _loc68_ =
            (_loc66_ << 8) |
            (_loc62_ < 0
              ? Math.floor(_loc62_ - 1e-10)
              : Math.floor(_loc62_ + 1e-10));
          _loc70_ = _loc68_;
          _loc63_ =
            1759 +
            _loc61_.intA * 5360233 +
            _loc61_.intB * 8417077 +
            _loc61_.intC * 4323961 +
            _loc61_.intD * 1764881 +
            _loc61_.intTx * 2337539 +
            _loc61_.intTy * 3257117 +
            _loc70_ * 28979 +
            _loc64_ * 178627 +
            99809;
          _loc72_ =
            _loc63_ < 0
              ? Math.floor(_loc63_ - 1e-10)
              : Math.floor(_loc63_ + 1e-10);
          _loc74_ = Math.abs(_loc72_) % PartStateParametersHashTable.SIZE;
          _loc21_ = PartStateParametersHashTable.table[_loc74_];
          _loc80_ =
            _loc21_ != null &&
            _loc21_.matrix == _loc61_ &&
            _loc21_.alphaAndBlendMode == _loc70_ &&
            _loc21_.colorTransform == _loc64_
              ? _loc21_
              : (PartStateParametersHashTable.table[_loc74_] =
                  new PartStateParameters(_loc61_, _loc70_, _loc64_));
          param4(_loc10_, _loc80_, _loc11_ + _loc57_, _loc57_);
        }
      } else {
        _loc41_ = 0;
        _loc56_ = _loc12_;
        while (_loc41_ < _loc56_) {
          _loc44_ = _loc41_++;
          param4(_loc10_, _loc20_, _loc11_ + _loc44_, _loc44_);
        }
      }
    }
  }

  addSegments(param1: any[], param2: IntMatrix[], param4: any[]): void {
    const { length } = param1;
    for (let i = 1; i <= length; i++) {
      const segment = param1[length - i];
      const kind = segment.s >>> 30;

      switch (kind) {
        case 0:
          this.addImageSegment(segment, param2);
          break;
        case 1:
          this.addMovieSegment(segment, param2, param4, i);
          break;
        case 2:
          this.addGraphicsSegment(segment, param2, param4, i);
          break;
      }
    }
  }

  addMovieSegment(
    param1: any,
    param2: IntMatrix[],
    param3: CustomTweenRecord[],
    param4: any[],
    param5: number
  ): void {}

  addImageSegment(param1: any, param2: IntMatrix[]): void {
    let _loc12_ = 0;
    let _loc13_: any = null;
    let _loc14_ = 0;
    let _loc15_: any = null;
    let _loc16_: IntMatrix = null;
    let _loc17_ = 0;
    let _loc18_ = 0;
    let _loc19_ = NaN;
    let _loc20_ = 0;
    let _loc21_ = 0;
    let _loc22_: PartStateParameters = null;
    let _loc23_: PartStateParameters = null;
    let _loc24_: PartStateParameters = null;
    let _loc25_ = 0;
    let _loc26_ = 0;
    let _loc27_ = 0;
    let _loc28_: PartState = null;
    let _loc29_: PartState = null;
    let _loc30_: any = null;
    let _loc31_ = NaN;
    let _loc32_: IntMatrix = null;
    let _loc33_: IntMatrix = null;
    let _loc34_ = NaN;
    let _loc35_ = NaN;
    let _loc36_ = NaN;
    let _loc37_ = NaN;
    let _loc38_ = NaN;
    let _loc39_ = NaN;
    let _loc40_ = NaN;
    let _loc41_ = NaN;
    let _loc42_ = NaN;
    let _loc43_ = NaN;
    let _loc44_ = NaN;
    let _loc45_ = NaN;
    let _loc46_ = false;
    let _loc47_ = NaN;
    let _loc48_ = NaN;
    let _loc49_ = 0;
    let _loc50_ = 0;
    let _loc51_ = false;
    let _loc52_ = 0;
    let _loc53_ = 0;
    let _loc54_ = 0;
    let _loc55_ = 0;
    let _loc56_ = 0;
    let _loc57_ = 0;
    let _loc58_ = 0;
    let _loc59_ = 0;
    let _loc60_ = 0;
    let _loc61_: any = null;
    let _loc62_ = 0;
    let _loc63_ = NaN;
    let _loc64_ = NaN;
    let _loc65_ = NaN;
    let _loc66_: IntMatrix = null;
    let _loc67_ = NaN;
    let _loc68_ = NaN;
    let _loc69_ = 0;
    let _loc70_ = NaN;
    let _loc71_ = 0;
    let _loc72_ = NaN;
    let _loc73_ = 0;
    let _loc74_ = NaN;
    let _loc75_ = 0;
    let _loc76_ = NaN;
    let _loc77_ = 0;
    let _loc78_ = NaN;
    let _loc79_ = 0;
    let _loc80_ = NaN;
    let _loc81_ = 0;
    let _loc82_ = 0;
    let _loc83_: IntMatrix = null;
    const _loc84_: IntMatrix = null;
    let _loc85_: PartStateParameters = null;
    const _loc86_: PartStateParameters = null;

    const _loc4_: GraphicsSource = this;
    let _loc5_: PartStateParameters = null;
    let _loc6_: PartState = null;
    const _loc7_: number = param1.s & 1073741823;
    let _loc8_ = 0;
    const _loc9_: any[] = param1.l;
    let _loc10_ = 0;
    const _loc11_: number = _loc9_.length;

    while (_loc10_ < _loc11_) {
      _loc12_ = _loc10_++;
      _loc13_ = _loc9_[_loc12_];
      _loc14_ = _loc8_;
      _loc15_ =
        (_loc13_.t == null ? null : _loc13_.t & 65535) != null
          ? _loc13_.t == null
            ? null
            : _loc13_.t & 65535
          : 1;
      _loc8_ = _loc14_ + _loc15_;
      _loc16_ = param2[_loc13_.m >>> 12];
      _loc17_ = _loc13_.m & 4095;
      _loc18_ = _loc13_.c != null ? _loc13_.c : 1677721600;
      _loc19_ =
        1759 +
        _loc16_.intA * 5360233 +
        _loc16_.intB * 8417077 +
        _loc16_.intC * 4323961 +
        _loc16_.intD * 1764881 +
        _loc16_.intTx * 2337539 +
        _loc16_.intTy * 3257117 +
        _loc17_ * 28979 +
        _loc18_ * 178627 +
        99809;
      _loc20_ =
        _loc19_ < 0 ? Math.floor(_loc19_ - 1e-10) : Math.floor(_loc19_ + 1e-10);
      _loc21_ = Math.abs(_loc20_) % PartStateParametersHashTable.SIZE;
      _loc22_ = PartStateParametersHashTable.table[_loc21_];
      _loc23_ =
        _loc22_ != null &&
        _loc22_.matrix == _loc16_ &&
        _loc22_.alphaAndBlendMode == _loc17_ &&
        _loc22_.colorTransform == _loc18_
          ? _loc22_
          : (PartStateParametersHashTable.table[_loc21_] =
              new PartStateParameters(_loc16_, _loc17_, _loc18_));
      _loc25_ = (_loc13_.t >> 16) & 3;
      _loc26_ = _loc25_;
      if (_loc26_ != 0) {
        _loc27_ = _loc7_ + _loc14_;
        _loc28_ = _loc4_.frames[_loc27_];
        _loc29_ =
          _loc23_ == _loc5_ && _loc6_ != null && _loc28_ == _loc6_.next
            ? _loc6_
            : new PartState(0, param1.i, 0, 0, _loc23_, _loc4_.frames[_loc27_]);
        _loc4_.frames[_loc27_] = _loc29_;
        _loc6_ = _loc29_;
        _loc5_ = _loc23_;
        _loc30_ = _loc9_[_loc12_ + 1];
        _loc31_ = (_loc30_.m & 4095 & 255) / 255;
        _loc32_ = param2[_loc13_.m >>> 12];
        _loc33_ = param2[_loc30_.m >>> 12];
        _loc34_ = _loc32_.intA / IntMatrix.RESOLUTION;
        _loc35_ = _loc32_.intB / IntMatrix.RESOLUTION;
        _loc36_ = _loc32_.intC / IntMatrix.RESOLUTION;
        _loc37_ = _loc32_.intD / IntMatrix.RESOLUTION;
        _loc38_ = _loc32_.intTx / IntMatrix.RESOLUTION;
        _loc39_ = _loc32_.intTy / IntMatrix.RESOLUTION;
        _loc40_ = _loc33_.intA / IntMatrix.RESOLUTION;
        _loc41_ = _loc33_.intB / IntMatrix.RESOLUTION;
        _loc42_ = _loc33_.intC / IntMatrix.RESOLUTION;
        _loc43_ = _loc33_.intD / IntMatrix.RESOLUTION;
        _loc44_ = _loc33_.intTx / IntMatrix.RESOLUTION;
        _loc45_ = _loc33_.intTy / IntMatrix.RESOLUTION;
        _loc46_ =
          _loc34_ == _loc40_ &&
          _loc35_ == _loc41_ &&
          _loc36_ == _loc42_ &&
          _loc37_ == _loc43_ &&
          _loc38_ == _loc44_ &&
          _loc39_ == _loc45_;
        _loc27_ = 50;
        _loc47_ = _loc27_ / 100;
        _loc48_ = (_loc23_.alphaAndBlendMode & 255) / 255;
        _loc49_ = _loc23_.colorTransform;
        _loc50_ = _loc30_.c != null ? _loc30_.c : 1677721600;
        _loc51_ = _loc49_ == _loc50_;
        _loc52_ = (_loc49_ >> 24) & 255;
        _loc53_ = (_loc49_ >> 16) & 255;
        _loc54_ = (_loc49_ >> 8) & 255;
        _loc55_ = _loc49_ & 255;
        _loc56_ = (_loc50_ >> 24) & 255;
        _loc57_ = (_loc50_ >> 16) & 255;
        _loc58_ = (_loc50_ >> 8) & 255;
        _loc59_ = _loc50_ & 255;
        _loc60_ = 1;
        _loc61_ = _loc15_;
        while (_loc60_ < _loc61_) {
          _loc62_ = _loc60_++;
          _loc63_ = _loc62_ / _loc15_;
          _loc64_ =
            _loc26_ == 2
              ? _loc47_ == 0
                ? _loc63_
                : _loc47_ < 0
                ? _loc63_ * (_loc63_ * -_loc47_ + Number(1 + _loc47_))
                : _loc63_ * ((2 - _loc63_) * _loc47_ + (1 - _loc47_))
              : Number(param3[_loc27_].getTweenRatio(_loc63_));
          _loc65_ = Number(_loc48_ * (1 - _loc64_) + _loc31_ * _loc64_);
          if (_loc46_) {
            _loc66_ = _loc32_;
          } else {
            _loc67_ = 1 - _loc64_;
            _loc68_ = Number(_loc34_ * _loc67_ + _loc40_ * _loc64_);
            _loc68_ *= IntMatrix.RESOLUTION;
            _loc69_ =
              _loc68_ >= 2147483647
                ? 2147483647
                : _loc68_ <= -2147483648
                ? -2147483648
                : _loc68_ < 0
                ? Number(_loc68_ - 1e-10)
                : Number(Number(_loc68_ + 1e-10));
            _loc70_ = Number(_loc35_ * _loc67_ + _loc41_ * _loc64_);
            _loc70_ *= IntMatrix.RESOLUTION;
            _loc71_ =
              _loc70_ >= 2147483647
                ? 2147483647
                : _loc70_ <= -2147483648
                ? -2147483648
                : _loc70_ < 0
                ? Number(_loc70_ - 1e-10)
                : Number(Number(_loc70_ + 1e-10));
            _loc72_ = Number(_loc36_ * _loc67_ + _loc42_ * _loc64_);
            _loc72_ *= IntMatrix.RESOLUTION;
            _loc73_ =
              _loc72_ >= 2147483647
                ? 2147483647
                : _loc72_ <= -2147483648
                ? -2147483648
                : _loc72_ < 0
                ? Number(_loc72_ - 1e-10)
                : Number(Number(_loc72_ + 1e-10));
            _loc74_ = Number(_loc37_ * _loc67_ + _loc43_ * _loc64_);
            _loc74_ *= IntMatrix.RESOLUTION;
            _loc75_ =
              _loc74_ >= 2147483647
                ? 2147483647
                : _loc74_ <= -2147483648
                ? -2147483648
                : _loc74_ < 0
                ? Number(_loc74_ - 1e-10)
                : Number(Number(_loc74_ + 1e-10));
            _loc76_ = Number(_loc38_ * _loc67_ + _loc44_ * _loc64_);
            _loc76_ *= IntMatrix.RESOLUTION;
            _loc77_ =
              _loc76_ >= 2147483647
                ? 2147483647
                : _loc76_ <= -2147483648
                ? -2147483648
                : _loc76_ < 0
                ? Number(_loc76_ - 1e-10)
                : Number(Number(_loc76_ + 1e-10));
            _loc78_ = Number(_loc39_ * _loc67_ + _loc45_ * _loc64_);
            _loc78_ *= IntMatrix.RESOLUTION;
            _loc79_ =
              _loc78_ >= 2147483647
                ? 2147483647
                : _loc78_ <= -2147483648
                ? -2147483648
                : _loc78_ < 0
                ? Number(_loc78_ - 1e-10)
                : Number(Number(_loc78_ + 1e-10));
            _loc80_ = Number(
              1759 +
                _loc69_ * 5360233 +
                _loc71_ * 8417077 +
                _loc73_ * 4323961 +
                _loc75_ * 1764881 +
                _loc77_ * 2337539 +
                _loc79_ * 3257117
            );
            _loc81_ =
              _loc80_ < 0
                ? Number(_loc80_ - 1e-10)
                : Number(Number(_loc80_ + 1e-10));
            _loc82_ = Number(
              (_loc81_ < 0 ? -_loc81_ : _loc81_) % MatrixHashTable.SIZE
            );
            _loc83_ = MatrixHashTable.table[_loc82_];
            _loc66_ =
              _loc83_ != null &&
              _loc83_.intA == _loc69_ &&
              _loc83_.intB == _loc71_ &&
              _loc83_.intC == _loc73_ &&
              _loc83_.intD == _loc75_ &&
              _loc83_.intTx == _loc77_ &&
              _loc83_.intTy == _loc79_
                ? _loc83_
                : (MatrixHashTable.table[_loc82_] = new IntMatrix(
                    _loc69_,
                    _loc71_,
                    _loc73_,
                    _loc75_,
                    _loc77_,
                    _loc79_
                  ));
          }
          if (_loc51_) {
            _loc69_ = _loc49_;
          } else {
            _loc67_ = 1 - _loc64_;
            _loc68_ = Number(_loc52_ * _loc67_ + _loc56_ * _loc64_);
            _loc70_ = Number(_loc53_ * _loc67_ + _loc57_ * _loc64_);
            _loc72_ = Number(_loc54_ * _loc67_ + _loc58_ * _loc64_);
            _loc74_ = Number(_loc55_ * _loc67_ + _loc59_ * _loc64_);
            _loc71_ =
              Number(
                ((_loc68_ < 0
                  ? Number(_loc68_ - 1e-10)
                  : Number(Number(_loc68_ + 1e-10))) &
                  255) <<
                  24
              ) |
              Number(
                ((_loc70_ < 0
                  ? Number(_loc70_ - 1e-10)
                  : Number(Number(_loc70_ + 1e-10))) &
                  255) <<
                  16
              ) |
              Number(
                ((_loc72_ < 0
                  ? Number(_loc72_ - 1e-10)
                  : Number(Number(_loc72_ + 1e-10))) &
                  255) <<
                  8
              ) |
              ((_loc74_ < 0
                ? Number(_loc74_ - 1e-10)
                : Number(Number(_loc74_ + 1e-10))) &
                255);
            _loc69_ = _loc71_;
          }
          _loc71_ = Number(_loc23_.alphaAndBlendMode >> 8);
          _loc67_ = _loc65_ * 255;
          _loc73_ =
            Number(_loc71_ << 8) |
            (_loc67_ < 0
              ? Number(_loc67_ - 1e-10)
              : Number(Number(_loc67_ + 1e-10)));
          _loc75_ = _loc73_;
          _loc68_ = Number(
            Number(
              Number(
                Number(
                  1759 +
                    _loc66_.intA * 5360233 +
                    _loc66_.intB * 8417077 +
                    _loc66_.intC * 4323961 +
                    _loc66_.intD * 1764881 +
                    _loc66_.intTx * 2337539 +
                    _loc66_.intTy * 3257117
                ) +
                  _loc75_ * 28979
              ) +
                _loc69_ * 178627
            ) + 99809
          );
          _loc77_ =
            _loc68_ < 0
              ? Number(_loc68_ - 1e-10)
              : Number(Number(_loc68_ + 1e-10));
          _loc79_ = Number(
            (_loc77_ < 0 ? -_loc77_ : _loc77_) %
              PartStateParametersHashTable.SIZE
          );
          _loc24_ = PartStateParametersHashTable.table[_loc79_];
          _loc85_ =
            _loc24_ != null &&
            _loc24_.matrix == _loc66_ &&
            _loc24_.alphaAndBlendMode == _loc75_ &&
            _loc24_.colorTransform == _loc69_
              ? _loc24_
              : (PartStateParametersHashTable.table[_loc79_] =
                  new PartStateParameters(_loc66_, _loc75_, _loc69_));
          _loc81_ = _loc7_ + (_loc14_ + _loc62_);
          _loc28_ = _loc4_.frames[_loc81_];
          _loc29_ =
            _loc85_ == _loc5_ && _loc6_ != null && _loc28_ == _loc6_.next
              ? _loc6_
              : new PartState(
                  0,
                  Number(param1.i),
                  0,
                  0,
                  _loc85_,
                  _loc4_.frames[_loc81_]
                );
          _loc4_.frames[_loc81_] = _loc29_;
          _loc6_ = _loc29_;
          _loc5_ = _loc85_;
        }
      } else {
        _loc27_ = 0;
        _loc61_ = _loc15_;
        while (_loc27_ < _loc61_) {
          _loc49_ = _loc27_++;
          _loc50_ = _loc7_ + (_loc14_ + _loc49_);
          _loc28_ = _loc4_.frames[_loc50_];
          _loc29_ =
            _loc23_ == _loc5_ && _loc6_ != null && _loc28_ == _loc6_.next
              ? _loc6_
              : new PartState(
                  0,
                  Number(param1.i),
                  0,
                  0,
                  _loc23_,
                  _loc4_.frames[_loc50_]
                );
          _loc4_.frames[_loc50_] = _loc29_;
          _loc6_ = _loc29_;
          _loc5_ = _loc23_;
        }
      }
    }
  }

  addGraphicsSegment(
    param1: any,
    param2: IntMatrix[],
    param4: any[],
    param5: number
  ): void {
    let _loc18_: number;
    let _loc19_: any;
    let _loc20_: number;
    let _loc21_: any;
    let _loc22_: IntMatrix;
    let _loc23_: number;
    let _loc24_: number;
    let _loc25_: number;
    let _loc26_: number;
    let _loc27_: number;
    let _loc28_: PartStateParameters;
    let _loc29_: PartStateParameters;
    let _loc30_: PartStateParameters;
    let _loc31_: number;
    let _loc32_: number;
    let _loc33_: number;
    let _loc34_: number;
    let _loc35_: number;
    let _loc36_: PartState;
    let _loc37_: PartState;
    let _loc38_: any;
    let _loc39_: number;
    let _loc40_: IntMatrix;
    let _loc41_: IntMatrix;
    let _loc42_: number;
    let _loc43_: number;
    let _loc44_: number;
    let _loc45_: number;
    let _loc46_: number;
    let _loc47_: number;
    let _loc48_: number;
    let _loc49_: number;
    let _loc50_: number;
    let _loc51_: number;
    let _loc52_: number;
    let _loc53_: number;
    let _loc54_: boolean;
    let _loc55_: number;
    let _loc56_: number;
    let _loc57_: boolean;
    let _loc58_: number;
    let _loc59_: number;
    let _loc60_: number;
    let _loc61_: number;
    let _loc62_: number;
    let _loc63_: number;
    let _loc64_: number;
    let _loc65_: number;
    let _loc66_: number;
    let _loc67_: any;
    let _loc68_: number;
    let _loc69_: number;
    let _loc70_: number;
    let _loc71_: number;
    let _loc72_: IntMatrix;
    let _loc73_: number;
    let _loc74_: number;
    let _loc75_: number;
    let _loc76_: number;
    let _loc77_: number;
    let _loc78_: number;
    let _loc79_: number;
    let _loc80_: number;
    let _loc81_: number;
    let _loc82_: number;
    let _loc83_: number;
    let _loc84_: number;
    let _loc85_: number;
    let _loc86_: number;
    let _loc87_: number;
    let _loc88_: number;
    let _loc89_: IntMatrix;
    let _loc90_: IntMatrix;
    let _loc91_: PartStateParameters;
    let _loc92_: PartStateParameters;
    let _loc93_: number;

    const _loc6_: GraphicsSource = this;
    const _loc7_: number = param1.i;
    const _loc8_: any = param4[_loc7_];
    const _loc9_: number = _loc8_.t;
    const _loc10_: number = param1.s & 1073741823;
    let _loc11_ = -1;
    let _loc12_: PartStateParameters = null;
    let _loc13_: PartState = null;
    let _loc14_ = 0;
    const _loc15_: any[] = param1.l;
    let _loc16_ = 0;
    const _loc17_: number = _loc15_.length;

    while (_loc16_ < _loc17_) {
      _loc18_ = _loc16_++;
      _loc19_ = _loc15_[_loc18_];
      _loc20_ = _loc14_;
      _loc21_ = _loc19_.t == null ? 1 : _loc19_.t & 65535;
      _loc14_ += _loc21_;
      _loc22_ = param2[_loc19_.m >>> 12];
      _loc23_ = _loc19_.m & 4095;
      _loc24_ = _loc19_.c != null ? _loc19_.c : 1677721600;
      _loc25_ =
        1759 +
        _loc22_.intA * 5360233 +
        _loc22_.intB * 8417077 +
        _loc22_.intC * 4323961 +
        _loc22_.intD * 1764881 +
        _loc22_.intTx * 2337539 +
        _loc22_.intTy * 3257117 +
        _loc23_ * 28979 +
        _loc24_ * 178627 +
        99809;
      _loc26_ =
        _loc25_ < 0 ? Math.floor(_loc25_ - 1e-10) : Math.floor(_loc25_ + 1e-10);
      _loc27_ = Math.abs(_loc26_) % PartStateParametersHashTable.SIZE;
      _loc28_ = PartStateParametersHashTable.table[_loc27_];
      if (
        !_loc28_ ||
        _loc28_.matrix !== _loc22_ ||
        _loc28_.alphaAndBlendMode !== _loc23_ ||
        _loc28_.colorTransform !== _loc24_
      ) {
        _loc28_ = PartStateParametersHashTable.table[_loc27_] =
          new PartStateParameters(_loc22_, _loc23_, _loc24_);
      }
      _loc31_ = (_loc19_.t >> 16) & 3;
      if (_loc31_ !== 0) {
        _loc32_ = _loc19_.r >>> 30;
        _loc33_ = GraphicsLoopKindTools.getFutureFrame(
          _loc32_,
          _loc19_.r & 1073741823,
          0,
          _loc9_
        );
        if (_loc33_ < _loc9_) {
          _loc34_ = _loc10_ + _loc20_;
          _loc35_ = _loc34_;
          _loc36_ = this.frames[_loc35_];
          _loc37_ =
            _loc33_ === _loc11_ &&
            _loc28_ === _loc12_ &&
            _loc13_ != null &&
            _loc36_ === _loc13_.next
              ? _loc13_
              : new PartState(
                  2,
                  _loc7_,
                  _loc33_,
                  param5,
                  _loc28_,
                  this.frames[_loc35_]
                );
          this.frames[_loc35_] = _loc37_;
          _loc13_ = _loc37_;
          _loc11_ = _loc33_;
          _loc12_ = _loc28_;
        }
        _loc38_ = _loc15_[_loc18_ + 1];
        _loc39_ = (_loc38_.m & 4095 & 255) / 255;
        _loc40_ = param2[_loc19_.m >>> 12];
        _loc41_ = param2[_loc38_.m >>> 12];
        _loc42_ = _loc40_.intA / IntMatrix.RESOLUTION;
        _loc43_ = _loc40_.intB / IntMatrix.RESOLUTION;
        _loc44_ = _loc40_.intC / IntMatrix.RESOLUTION;
        _loc45_ = _loc40_.intD / IntMatrix.RESOLUTION;
        _loc46_ = _loc40_.intTx / IntMatrix.RESOLUTION;
        _loc47_ = _loc40_.intTy / IntMatrix.RESOLUTION;
        _loc48_ = _loc41_.intA / IntMatrix.RESOLUTION;
        _loc49_ = _loc41_.intB / IntMatrix.RESOLUTION;
        _loc50_ = _loc41_.intC / IntMatrix.RESOLUTION;
        _loc51_ = _loc41_.intD / IntMatrix.RESOLUTION;
        _loc52_ = _loc41_.intTx / IntMatrix.RESOLUTION;
        _loc53_ = _loc41_.intTy / IntMatrix.RESOLUTION;
        _loc54_ =
          _loc42_ === _loc48_ &&
          _loc43_ === _loc49_ &&
          _loc44_ === _loc50_ &&
          _loc45_ === _loc51_ &&
          _loc46_ === _loc52_ &&
          _loc47_ === _loc53_;
        _loc55_ = 52 / 100;
        _loc56_ = (_loc28_.alphaAndBlendMode & 255) / 255;
        _loc34_ = _loc28_.colorTransform;
        _loc35_ = _loc38_.c != null ? _loc38_.c : 1677721600;
        _loc57_ = _loc34_ === _loc35_;
        _loc58_ = (_loc34_ >> 24) & 255;
        _loc59_ = (_loc34_ >> 16) & 255;
        _loc60_ = (_loc34_ >> 8) & 255;
        _loc61_ = _loc34_ & 255;
        _loc62_ = (_loc35_ >> 24) & 255;
        _loc63_ = (_loc35_ >> 16) & 255;
        _loc64_ = (_loc35_ >> 8) & 255;
        _loc65_ = _loc35_ & 255;
        for (let _loc66_ = 1; _loc66_ < _loc21_; _loc66_++) {
          const _loc67_ = _loc66_ / _loc21_;
          const _loc68_ =
            _loc31_ === 2
              ? _loc55_ === 0
                ? _loc67_
                : _loc55_ < 0
                ? _loc67_ * (_loc67_ * -_loc55_ + 1 + _loc55_)
                : _loc67_ * ((2 - _loc67_) * _loc55_ + 1 - _loc55_)
              : 1;
          const _loc69_ = _loc56_ * (1 - _loc68_) + _loc39_ * _loc68_;
          let _loc70_: IntMatrix;
          if (!_loc54_) {
            const _loc71_ = 1 - _loc68_;
            const _loc72_ = _loc42_ * _loc71_ + _loc48_ * _loc68_;
            const _loc73_ = _loc43_ * _loc71_ + _loc49_ * _loc68_;
            const _loc74_ = _loc44_ * _loc71_ + _loc50_ * _loc68_;
            const _loc75_ = _loc45_ * _loc71_ + _loc51_ * _loc68_;
            const _loc76_ = _loc46_ * _loc71_ + _loc52_ * _loc68_;
            const _loc77_ = _loc47_ * _loc71_ + _loc53_ * _loc68_;
            _loc70_ = new IntMatrix(
              Math.floor(_loc72_ * IntMatrix.RESOLUTION),
              Math.floor(_loc73_ * IntMatrix.RESOLUTION),
              Math.floor(_loc74_ * IntMatrix.RESOLUTION),
              Math.floor(_loc75_ * IntMatrix.RESOLUTION),
              Math.floor(_loc76_ * IntMatrix.RESOLUTION),
              Math.floor(_loc77_ * IntMatrix.RESOLUTION)
            );
          } else {
            _loc70_ = _loc40_;
          }
          let _loc78_: number;
          if (!_loc57_) {
            const _loc79_ = _loc58_ * (1 - _loc68_) + _loc62_ * _loc68_;
            const _loc80_ = _loc59_ * (1 - _loc68_) + _loc63_ * _loc68_;
            const _loc81_ = _loc60_ * (1 - _loc68_) + _loc64_ * _loc68_;
            const _loc82_ = _loc61_ * (1 - _loc68_) + _loc65_ * _loc68_;
            _loc78_ =
              ((_loc79_ << 24) & 0xff000000) |
              ((_loc80_ << 16) & 0x00ff0000) |
              ((_loc81_ << 8) & 0x0000ff00) |
              (_loc82_ & 0x000000ff);
          } else {
            _loc78_ = _loc34_;
          }
          const _loc83_ =
            ((_loc28_.alphaAndBlendMode >> 8) << 8) | Math.floor(_loc69_ * 255);
          _loc29_ = new PartStateParameters(_loc70_, _loc83_, _loc78_);
          _loc32_ = _loc19_.r >>> 30;
          _loc33_ = GraphicsLoopKindTools.getFutureFrame(
            _loc32_,
            _loc19_.r & 1073741823,
            _loc66_,
            _loc9_
          );
          if (_loc33_ < _loc9_) {
            _loc34_ = _loc10_ + _loc20_ + _loc66_;
            _loc36_ = this.frames[_loc34_];
            _loc37_ =
              _loc33_ === _loc11_ &&
              _loc29_ === _loc12_ &&
              _loc13_ != null &&
              _loc36_ === _loc13_.next
                ? _loc13_
                : new PartState(
                    2,
                    _loc7_,
                    _loc33_,
                    param5,
                    _loc29_,
                    this.frames[_loc34_]
                  );
            this.frames[_loc34_] = _loc37_;
            _loc13_ = _loc37_;
            _loc11_ = _loc33_;
            _loc12_ = _loc29_;
          }
        }
      } else {
        for (let _loc84_ = 0; _loc84_ < _loc21_; _loc84_++) {
          _loc32_ = _loc19_.r >>> 30;
          _loc33_ = GraphicsLoopKindTools.getFutureFrame(
            _loc32_,
            _loc19_.r & 1073741823,
            _loc84_,
            _loc9_
          );
          if (_loc33_ < _loc9_) {
            _loc34_ = _loc10_ + _loc20_ + _loc84_;
            _loc36_ = this.frames[_loc34_];
            _loc37_ =
              _loc33_ === _loc11_ &&
              _loc28_ === _loc12_ &&
              _loc13_ != null &&
              _loc36_ === _loc13_.next
                ? _loc13_
                : new PartState(
                    2,
                    _loc7_,
                    _loc33_,
                    param5,
                    _loc28_,
                    this.frames[_loc34_]
                  );
            this.frames[_loc34_] = _loc37_;
            _loc13_ = _loc37_;
            _loc11_ = _loc33_;
            _loc12_ = _loc28_;
          }
        }
      }
    }
  }

  addFrame(param1: number, param2: PartState): void {
    this.frames[param1] = param2;
  }
}
