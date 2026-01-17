import { BaseEmitter } from "../emitter";
import { ILogErrorReq, ILogInfoReq, ILogWarnReq } from "./interface";

export enum LOGGER_EV {
  ERROR = "LOG_ERROR",
  INFO = "LOG_INFO",
  WARN = "LOG_WARN",
}

export default class Logger {
  private readonly id: string;
  private readonly emitter?: BaseEmitter;
  constructor(id: string, emitter?: BaseEmitter) {
    this.id = id;
    this.emitter = emitter;
  }

  debug(data: any, ...opt: any[]) {
    if (process.env.DEBUG !== "true") {
      return;
    }
    const now = new Date();
    if (opt.length) {
      console.debug(
        `[${now.toISOString().substring(11)} ${this.id}]`,
        data,
        ...opt,
      );
    } else {
      console.debug(`[${now.toISOString().substring(11)} ${this.id}]`, data);
    }
  }
  async error(message: string, data?: any, userId?: string) {
    if (data?.err instanceof Error) {
      data.err = (data.err as Error).message;
    }

    const now = new Date();
    if (process.env.DEBUG === "true") {
      console.error(
        `[${now.toISOString().substring(11)} ${this.id}]`,
        message,
        data,
      );
      return;
    }
    try {
      await this.emitter?.pub(LOGGER_EV.ERROR, {
        app: this.id,
        data,
        message,
        userId,
        create: now.getTime(),
      } as ILogErrorReq);
    } catch (err) {
      console.error(err);
    }
  }
  async info(message: string, data?: any, userId?: string) {
    const now = new Date();
    if (process.env.DEBUG === "true") {
      console.info(
        `[${now.toISOString().substring(11)} ${this.id}]`,
        message,
        data,
      );
      return;
    }

    try {
      await this.emitter?.pub(LOGGER_EV.INFO, {
        app: this.id,
        data,
        message,
        userId,
        create: now.getTime(),
      } as ILogInfoReq);
    } catch (err) {
      console.error(err);
    }
  }
  async warn(message: string, data?: any, userId?: string) {
    const now = new Date();
    if (process.env.DEBUG === "true") {
      console.warn(
        `[${now.toISOString().substring(11)} ${this.id}]`,
        message,
        data,
      );
      return;
    }

    try {
      await this.emitter?.pub(LOGGER_EV.WARN, {
        app: this.id,
        data,
        message,
        userId,
        create: now.getTime(),
      } as ILogWarnReq);
    } catch (err) {
      console.error(err);
    }
  }
}

export { Logger };
