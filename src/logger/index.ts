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
    if (opt.length) {
      console.log(
        `[${new Date().toISOString().substring(11)} ${this.id}]`,
        data,
        ...opt
      );
    } else {
      console.log(
        `[${new Date().toISOString().substring(11)} ${this.id}]`,
        data
      );
    }
  }
  async error(message: string, data?: any, userId?: string) {
    if (data?.err instanceof Error) {
      data.err = (data.err as Error).message;
    }

    if (process.env.DEBUG === "true") {
      console.error(
        `[${new Date().toISOString().substring(11)} ${this.id}]`,
        message,
        data
      );
      return;
    }
    try {
      await this.emitter?.pub(LOGGER_EV.ERROR, {
        app: this.id,
        data,
        message,
        userId,
      } as ILogErrorReq);
    } catch (err) {
      console.error(err);
    }
  }
  async info(message: string, data?: any, userId?: string) {
    if (process.env.DEBUG === "true") {
      console.info(
        `[${new Date().toISOString().substring(11)} ${this.id}]`,
        message,
        data
      );
      return;
    }

    try {
      await this.emitter?.pub(LOGGER_EV.INFO, {
        app: this.id,
        data,
        message,
        userId,
      } as ILogInfoReq);
    } catch (err) {
      console.error(err);
    }
  }
  async warn(message: string, data?: any, userId?: string) {
    if (process.env.DEBUG === "true") {
      console.warn(
        `[${new Date().toISOString().substring(11)} ${this.id}]`,
        message,
        data
      );
      return;
    }

    try {
      await this.emitter?.pub(LOGGER_EV.WARN, {
        app: this.id,
        data,
        message,
        userId,
      } as ILogWarnReq);
    } catch (err) {
      console.error(err);
    }
  }
}

export { Logger };
