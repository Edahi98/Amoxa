export interface ComponentEventsInit {
  press?: string;
  change?: string;
  submit?: string;
  longPress?: string;
}

export class ComponentEventsModel {
  public readonly press?: string;
  public readonly change?: string;
  public readonly submit?: string;
  public readonly longPress?: string;

  constructor(init: ComponentEventsInit) {
    this.press = init.press;
    this.change = init.change;
    this.submit = init.submit;
    this.longPress = init.longPress;
  }
}
