type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "object"
  | "array"
  | "boolean"
  | "null";

export type JsonSchemaFormat =
  // TODO: not recognazed
  // | "date-time"
  // | "date"
  | "time"
  | "email"
  | "idn-email"
  | "hostname"
  | "idn-hostname"
  | "ipv4"
  | "ipv6"
  | "uri"
  | "uri-reference"
  | "iri"
  | "iri-reference"
  | "uri-template"
  | "json-pointer"
  | "relative-json-pointer"
  | "regex"
  | "uuid"
  | "duration"
  | "byte" // base64 encoded dat
  | "password";
type JsonNumberSchemaFormat = "date-time" | "date" | "time" | "duration";
// CONDITION
type BaseCondition = {
  if: LogicalJsonSchema;
  then: LogicalJsonSchema;
};

type ExtendedCondition = BaseCondition & {
  else: LogicalJsonSchema;
};
export type ConditionJsonSchema = BaseCondition | ExtendedCondition;
// LOGICAL
export type LogicalJsonSchema = Omit<
  IJsonSchema,
  "type" | "properties" | "required" | "items"
> & {
  type?: JsonSchemaType;
  properties?: { [key: string]: IJsonSchema };
  required?: string[];
  items?: never;
};
export type ExtendedLogicalJsonSchema = {
  anyOf?: LogicalJsonSchema[];
  allOf?: (LogicalJsonSchema | ConditionJsonSchema)[];
  oneOf?: LogicalJsonSchema[];
  not?: LogicalJsonSchema;
};
// COMMON
type BaseJsonSchema = {
  title?: string;
  description?: string;
  nullable?: boolean;
  readOnly?: boolean;
  examples?: string[];
};

type CommonJsonSchema = BaseJsonSchema &
  (ExtendedLogicalJsonSchema | ConditionJsonSchema);
// TYPES
export type JsonStringSchema = {
  type: "string";
  format?: JsonSchemaFormat;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  default?: string;
};
export type JsonNumberSchema = {
  type: "number" | "integer";
  format?: JsonNumberSchemaFormat;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  enum?: number[];
  default?: number;
};
export type JsonObjectSchema = {
  type: "object";
  properties: { [key: string]: IJsonSchema };
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | IJsonSchema;
};
export type JsonArraySchema = {
  type: "array";
  items: IJsonSchema; // | IJsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
};
export type JsonBooleanSchema = {
  type: "boolean";
  default?: boolean;
};
export type JsonNullSchema = {
  type: "null";
};
// Json Schema
export type IJsonSchema = CommonJsonSchema &
  (
    | JsonStringSchema
    | JsonNumberSchema
    | JsonObjectSchema
    | JsonArraySchema
    | JsonBooleanSchema
    | JsonNullSchema
  );
// JSON
export type JsonType =
  | string
  | number
  | boolean
  | Date
  | JsonType[]
  | { [key: string]: JsonType };
export interface IJson {
  [key: string]: JsonType;
}
export interface IValidateReq {
  json: IJson;
  schema: IJsonSchema;
  field?: string;
  onError?: (err: Error) => boolean;
}
