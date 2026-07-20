export interface TelemetryData {
  time: number;
  position: { x: number; y: number; z: number };
  velocity: number;
  acceleration: number;
}

export class TelemetryLogger {
  private log: TelemetryData[] = [];

  public record(data: TelemetryData) {
    this.log.push(data);
  }

  public getLog(): TelemetryData[] {
    return this.log;
  }

  public clear() {
    this.log = [];
  }
}
