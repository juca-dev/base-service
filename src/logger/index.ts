import { EmitterService } from "emitter";
import { ILogErrorReq, ILogInfoReq, ILogWarnReq } from "./interface";

enum KEY {
  ERROR = "LOG_ERROR",
  INFO = "LOG_INFO",
  WARN = "LOG_WARN",
}

export default class Logger {
  private readonly id: string;
  constructor(id: string) {
    this.id = id;
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
    if (process.env.DEBUG !== "true") {
      return;
    }

    if (data?.err instanceof Error) {
      data.err = (data.err as Error).message;
    }
    console.error(
      `[${new Date().toISOString().substring(11)} ${this.id}]`,
      message,
      data
    );

    EmitterService.pub(KEY.ERROR, {
      app: this.id,
      data,
      message,
      userId,
    } as ILogErrorReq);
  }
  async info(message: string, data?: any, userId?: string) {
    if (process.env.DEBUG !== "true") {
      return;
    }
    console.info(
      `[${new Date().toISOString().substring(11)} ${this.id}]`,
      message,
      data
    );

    EmitterService.pub(KEY.INFO, {
      app: this.id,
      data,
      message,
      userId,
    } as ILogInfoReq);
  }
  async warn(message: string, data?: any, userId?: string) {
    if (process.env.DEBUG !== "true") {
      return;
    }

    console.warn(
      `[${new Date().toISOString().substring(11)} ${this.id}]`,
      message,
      data
    );

    EmitterService.pub(KEY.WARN, {
      app: this.id,
      data,
      message,
      userId,
    } as ILogWarnReq);
  }
}

export { Logger };
