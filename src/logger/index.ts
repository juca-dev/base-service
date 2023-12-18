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
  }
}

export { Logger };
