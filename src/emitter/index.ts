import EventEmitter from "events";

const emitter = new EventEmitter();

abstract class BaseEmitter {
  private async delay(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async pub(id: string, ...args: any[]) {
    const res = emitter.emit(id, args);
    console.log("pub", { res, args });
    if (res) {
      await this.delay(150); // delay to wait subscribed
    }
  }
  async sub(id: string, listener: (...args: any[]) => Promise<void> | void) {
    return new Promise((resolve, reject) => {
      emitter.on(id, async (args) => {
        Promise.resolve(listener(args)).then(resolve).catch(reject);
      });
    });
  }
}

export { BaseEmitter };
