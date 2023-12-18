import EventEmitter from "events";

const emitter = new EventEmitter();

abstract class BaseEmitter {
  pub(id: string, ...args: any[]) {
    return emitter.emit(id, args);
  }
  sub(id: string, listener: (...args: any[]) => void) {
    return emitter.on(id, listener);
  }
}

export { BaseEmitter };
