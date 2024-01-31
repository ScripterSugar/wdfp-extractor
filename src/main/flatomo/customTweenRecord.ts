import CustomTweenTools from './customTweenTools';

export default class CustomTweenRecord {
  segments: SegmentRecord[];

  segmentNumber: number;

  resource: number[];

  constructor(param1: number[] = undefined) {
    this.resource = param1;
    const segmentNumberCalc = Math.floor((param1.length + 2) / 6);
    this.segmentNumber =
      segmentNumberCalc < 0
        ? Math.floor(segmentNumberCalc - 1e-10)
        : Math.floor(segmentNumberCalc + 1e-10);
    this.segments = Array(this.segmentNumber).fill(null);
  }

  getTweenRatio(param1: number): number {
    let index = 0;
    let high = this.segmentNumber - 1;
    while (high !== index) {
      const mid = index + Math.ceil((high - index) / 2);
      const midValue =
        this.resource[mid * 6 - 2] / CustomTweenTools.CUSTOM_TWEEN_MAX;
      if (param1 < midValue) {
        high = mid - 1;
      } else {
        index = mid;
      }
    }

    let segment = this.segments[index];
    if (segment === null) {
      const startX =
        index === 0
          ? 0
          : this.resource[index * 6 - 2] / CustomTweenTools.CUSTOM_TWEEN_MAX;
      const startY =
        index === 0
          ? 0
          : this.resource[index * 6 - 1] / CustomTweenTools.CUSTOM_TWEEN_MAX;
      const endX =
        index === this.segmentNumber - 1
          ? 1
          : this.resource[index * 6 + 4] / CustomTweenTools.CUSTOM_TWEEN_MAX;
      const endY =
        index === this.segmentNumber - 1
          ? 1
          : this.resource[index * 6 + 5] / CustomTweenTools.CUSTOM_TWEEN_MAX;

      segment = this.segments[index] = new SegmentRecord(
        startX,
        startY,
        this.resource[index * 6] / CustomTweenTools.CUSTOM_TWEEN_MAX,
        this.resource[index * 6 + 1] / CustomTweenTools.CUSTOM_TWEEN_MAX,
        this.resource[index * 6 + 2] / CustomTweenTools.CUSTOM_TWEEN_MAX,
        this.resource[index * 6 + 3] / CustomTweenTools.CUSTOM_TWEEN_MAX,
        endX,
        endY
      );
    }

    return segment.getYForX(param1);
  }
}
