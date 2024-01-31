export default class CustomTweenTools {
  static CUSTOM_TWEEN_MAX: number = 1000000;

  static toResource(param1: { x: number; y: number }[]): number[] {
    const result: number[] = [];
    for (let i = 1; i < param1.length - 1; i++) {
      const item = param1[i];
      result.push(Math.round(item.x * CustomTweenTools.CUSTOM_TWEEN_MAX));
      result.push(Math.round(item.y * CustomTweenTools.CUSTOM_TWEEN_MAX));
    }
    return result;
  }

  static toString(param1: any[]): string {
    return param1.join(',');
  }
}
