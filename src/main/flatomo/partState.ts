import PartStateParameters from './partStateParameter';

export default class PartState {
  parameters: PartStateParameters;

  next: PartState;

  kind: number;

  referencingFrame: number;

  id: number;

  indexForPath: number;

  constructor(
    param1 = 0,
    param2 = 0,
    param3 = 0,
    param4 = 0,
    param5: PartStateParameters,
    param6: PartState
  ) {
    this.parameters = param5;
    this.next = param6;
    this.kind = param1;
    this.referencingFrame = param3;
    this.id = param2;
    this.indexForPath = param4;
  }
}
