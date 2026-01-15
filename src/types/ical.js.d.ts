declare module 'ical.js' {
  export class Component {
    constructor(jcal: any | string);
    getFirstSubcomponent(name: string): Component | null;
    getFirstPropertyValue(name: string): any;
    addPropertyWithValue(name: string, value: any): void;
    addSubcomponent(component: Component): void;
    toString(): string;
  }

  export class Time {
    static fromJSDate(date: Date): Time;
    static now(): Time;
    toJSDate(): Date;
  }

  export function parse(input: string): any;
}
