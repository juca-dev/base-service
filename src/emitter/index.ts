import EventEmitter from "events";

const emitter = new EventEmitter();

abstract class BaseEmitter {
  pub(id: string, ...args: any[]) {
    return emitter.emit(id, args);
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
