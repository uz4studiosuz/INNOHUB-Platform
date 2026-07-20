export class SimulationRunLoop {
  private active = false;
  private lastTime = 0;
  private callback: (dt: number) => void;

  constructor(callback: (dt: number) => void) {
    this.callback = callback;
  }

  public start() {
    this.active = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  public stop() {
    this.active = false;
  }

  private loop(time: number) {
    if (!this.active) return;
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.callback(dt);
    requestAnimationFrame(this.loop.bind(this));
  }
}
