import { IBaseConstructor } from "./interface";
import { ENV_REQUIRED } from "../error";
import { Logger } from "../logger";
import Crypto from "crypto";

export default abstract class BaseService {
  protected readonly app: string;
  protected readonly id: string;
  protected readonly log: Logger;
  protected constructor({ id }: IBaseConstructor) {
    if (!process.env.APP) {
      throw ENV_REQUIRED("APP");
    }
    this.id = id;
    this.app = process.env.APP;
    this.log = new Logger(id);
  }
  protected generateUUID(): string {
    return Crypto.randomUUID();
  }

  protected generateId(value: string): string {
    const newValue = value
      .trim()
      .toLowerCase()
      .replace(/[\s\.]+/g, "-") // replace <space or .> to -
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // remove accents

    const res = newValue.match(/([a-z0-9\-])+/g);
    if (!res) {
      this.log.debug(`generateId(${value})`, "invalid");
      return this.generateUUID();
    }

    return res.join("");
  }
  async delay(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

export { IBaseConstructor, BaseService };
