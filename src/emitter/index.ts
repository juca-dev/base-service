import EventEmitter from "events";

const emitter = new EventEmitter();

class EmitterService {
  pub(id: string, ...args: any[]) {
    return emitter.emit(id, args);
  }
  sub(id: string, listener: (...args: any[]) => void) {
    return emitter.on(id, listener);
  }
}

const service = new EmitterService();
export { service as EmitterService };
