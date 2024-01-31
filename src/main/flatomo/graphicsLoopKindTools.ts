export default class GraphicsLoopKindTools {
  static getFutureFrame(
    param1: number,
    param2: number,
    param3: number,
    param4: number
  ): number {
    switch (param1) {
      case 0:
        return param2;
      case 1:
        return Math.ceil(Math.min(param2 + param3, param4 - 1));
      case 2:
        return (param2 + param3) % param4;
      default:
        return 0;
    }
  }
}
