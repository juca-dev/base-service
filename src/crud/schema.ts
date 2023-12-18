import { IJsonSchema } from "../schema/interface";
import { Status } from "./status";

export const IBaseSchema: IJsonSchema = {
  type: "object",
  // required: ["id", "status", "create", "createBy", "update", "updateBy"],
  properties: {
    id: {
      type: "string",
    },
    status: {
      type: "integer",
      readOnly: true,
      enum: Object.values(Status).map((e) => Number(e)),
    },
    create: {
      type: "integer",
      // format: "date-time",
    },
    createBy: {
      type: "string",
      format: "uuid",
    },
    update: {
      type: "integer",
      // format: "date-time",
    },
    updateBy: {
      type: "string",
      format: "uuid",
    },
  },
};
// TODO: apply to schemas
export const ICrudSchema: IJsonSchema = {
  type: "object",
  // required: ["id", "status", "create", "createBy", "update", "updateBy"],
  properties: {
    ...IBaseSchema.properties,
    draft: {
      type: "integer",
      // format: "date-time",
    },
    enable: {
      type: "integer",
      // format: "date-time",
    },
    disable: {
      type: "integer",
      // format: "date-time",
    },
    block: {
      type: "integer",
      // format: "date-time",
    },
    delete: {
      type: "integer",
      // format: "date-time",
    },
    star: {
      type: "integer",
      // format: "date-time",
    },
    userId: {
      type: "string",
      // format: "uuid",
    },
    statusReason: {
      type: "string",
    },
    ver: {
      type: "integer",
      minimum: 0,
    },
  },
};
