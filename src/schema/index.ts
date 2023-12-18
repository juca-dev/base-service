import {
  ConditionJsonSchema,
  ExtendedLogicalJsonSchema,
  IJsonSchema,
  IValidateReq,
  JsonArraySchema,
  JsonBooleanSchema,
  JsonNumberSchema,
  JsonObjectSchema,
  JsonSchemaFormat,
  JsonStringSchema,
  LogicalJsonSchema,
} from "./interface";

export class SchemaError extends Error {
  public readonly field: string;
  constructor(message: string, field: string) {
    super(message);
    this.field = field;
  }
}

export class SchemaService {
  static validate({ json, schema, field = "$", onError }: IValidateReq): void {
    if (schema.type) {
      switch (schema.type) {
        case "string":
          this.validateString(json, schema, field, onError);
          break;
        case "number":
          this.validateNumber(json, schema, field, onError);
          break;
        case "integer":
          this.validateInteger(json, schema, field, onError);
          break;
        case "object":
          this.validateObject(json, schema, field, onError);
          break;
        case "array":
          this.validateArray(json, schema, field, onError);
          break;
        case "boolean":
          this.validateBoolean(json, schema, field, onError);
          break;
        case "null":
          if (json !== null) {
            throw new SchemaError(`Expected null value at "${field}".`, field);
          }
          break;
        default:
          throw new SchemaError(`Invalid type in schema at "${field}".`, field);
      }
    } else {
      this.validateObject(json, schema, field, onError);
    }
  }

  private static validateBoolean(
    json: any,
    schema: JsonBooleanSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    if (typeof json !== "boolean") {
      const err = new SchemaError(`Expected a boolean at "${field}".`, field);
      if (!onError || onError(err)) {
        throw err;
      }
      return; // avoid continue
    }
  }

  private static validateObject(
    json: any,
    schema: JsonObjectSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    if (typeof json !== "object" || json === null) {
      const err = new SchemaError(`Expected an object at "${field}".`, field);
      if (!onError || onError(err)) {
        throw err;
      }
      return; // avoid continue
    }

    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in json)) {
          const err = new SchemaError(
            `Missing required property "${key}" at "${field}".`,
            field
          );
          if (!onError || onError(err)) {
            throw err;
          }
        }
      }
    }

    const jsonKeys = Object.keys(json).filter((k) => json[k] !== undefined);
    if (
      schema.minProperties !== undefined &&
      jsonKeys.length < schema.minProperties
    ) {
      const err = new SchemaError(
        `Object has fewer properties than minProperties ${schema.minProperties} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (
      schema.maxProperties !== undefined &&
      jsonKeys.length > schema.maxProperties
    ) {
      const err = new SchemaError(
        `Object has more properties than maxProperties ${schema.maxProperties} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }

    jsonKeys.forEach((key) => {
      if (schema.properties && key in schema.properties) {
        this.validate({
          json: json[key],
          schema: schema.properties[key],
          field: `${field}.${key}`,
          onError,
        });
      } else if (schema.additionalProperties === false) {
        const err = new SchemaError(
          `Unexpected property "${key}" at "${field}".`,
          field
        );
        if (!onError || onError(err)) {
          throw err;
        }
      } else if (typeof schema.additionalProperties === "object") {
        this.validate({
          json: json[key],
          schema: schema.additionalProperties,
          field: `${field}.${key}`,
          onError,
        });
      }
    });

    if (
      "anyOf" in schema ||
      "allOf" in schema ||
      "oneOf" in schema ||
      "not" in schema
    ) {
      this.validateExtendedLogicalSchema(
        json,
        schema as ExtendedLogicalJsonSchema,
        field,
        onError
      );
    }

    if ("if" in schema) {
      this.validateConditionalSchema(json, schema as any, field, onError);
    }
  }
  private static validateString(
    json: any,
    schema: JsonStringSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    if (typeof json !== "string") {
      const err = new SchemaError(`Expected a string at "${field}".`, field);
      if (!onError || onError(err)) {
        throw err;
      }
      return; // avoid continue
    }
    if (schema.minLength !== undefined && json.length < schema.minLength) {
      const err = new SchemaError(
        `String is shorter than minLength ${schema.minLength} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.maxLength !== undefined && json.length > schema.maxLength) {
      const err = new SchemaError(
        `String is longer than maxLength ${schema.maxLength} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (
      schema.pattern !== undefined &&
      !new RegExp(schema.pattern).test(json)
    ) {
      const err = new SchemaError(
        `String does not match pattern ${schema.pattern} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.enum !== undefined && !schema.enum.includes(json)) {
      const err = new SchemaError(
        `String does not match any enum values at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (
      schema.format !== undefined &&
      !this.validateStringFormat(json, schema.format)
    ) {
      const err = new SchemaError(
        `String does not match format ${schema.format} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
  }
  private static validateStringFormat(
    json: string,
    format: JsonSchemaFormat
  ): boolean {
    switch (format) {
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(json);
      // TODO: Add other format validations as needed
      default:
        return true;
    }
    return true;
  }
  private static validateNumber(
    json: any,
    schema: JsonNumberSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    if (typeof json !== "number" || isNaN(json)) {
      const err = new SchemaError(`Expected a number at "${field}".`, field);
      if (!onError || onError(err)) {
        throw err;
      }
      return; // avoid continue
    }
    if (schema.minimum !== undefined && json < schema.minimum) {
      const err = new SchemaError(
        `Number is less than minimum ${schema.minimum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (
      schema.exclusiveMinimum !== undefined &&
      json <= schema.exclusiveMinimum
    ) {
      const err = new SchemaError(
        `Number is less than or equal to exclusive minimum ${schema.exclusiveMinimum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.maximum !== undefined && json > schema.maximum) {
      const err = new SchemaError(
        `Number is greater than maximum ${schema.maximum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (
      schema.exclusiveMaximum !== undefined &&
      json >= schema.exclusiveMaximum
    ) {
      const err = new SchemaError(
        `Number is greater than or equal to exclusive maximum ${schema.exclusiveMaximum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.multipleOf !== undefined && json % schema.multipleOf !== 0) {
      const err = new SchemaError(
        `Number is not a multiple of ${schema.multipleOf} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.enum !== undefined && !schema.enum.includes(json)) {
      const err = new SchemaError(
        `Number does not match any enum values at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
  }
  private static validateInteger(
    json: any,
    schema: JsonNumberSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    if (typeof json !== "number" || !Number.isInteger(json)) {
      const err = new SchemaError(`Expected an integer at "${field}".`, field);
      if (!onError || onError(err)) {
        throw err;
      }
      return; // avoid continue
    }
    if (schema.minimum !== undefined && json < schema.minimum) {
      const err = new SchemaError(
        `Integer is less than minimum ${schema.minimum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (
      schema.exclusiveMinimum !== undefined &&
      json <= schema.exclusiveMinimum
    ) {
      const err = new SchemaError(
        `Integer is less than or equal to exclusive minimum ${schema.exclusiveMinimum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.maximum !== undefined && json > schema.maximum) {
      const err = new SchemaError(
        `Integer is greater than maximum ${schema.maximum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (
      schema.exclusiveMaximum !== undefined &&
      json >= schema.exclusiveMaximum
    ) {
      const err = new SchemaError(
        `Integer is greater than or equal to exclusive maximum ${schema.exclusiveMaximum} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.multipleOf !== undefined && json % schema.multipleOf !== 0) {
      const err = new SchemaError(
        `Integer is not a multiple of ${schema.multipleOf} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.enum !== undefined && !schema.enum.includes(json)) {
      const err = new SchemaError(
        `Integer does not match any enum values at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
  }
  private static validateArray(
    json: any,
    schema: JsonArraySchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    if (!Array.isArray(json)) {
      const err = new SchemaError(`Expected an array at "${field}".`, field);
      if (!onError || onError(err)) {
        throw err;
      }
      return; // avoid continue
    }
    if (schema.minItems !== undefined && json.length < schema.minItems) {
      const err = new SchemaError(
        `Array has fewer items than minItems ${schema.minItems} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.maxItems !== undefined && json.length > schema.maxItems) {
      const err = new SchemaError(
        `Array has more items than maxItems ${schema.maxItems} at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
    if (schema.uniqueItems) {
      const uniqueSet = new Set(json);
      if (uniqueSet.size !== json.length) {
        const err = new SchemaError(
          `Array items are not unique at "${field}".`,
          field
        );
        if (!onError || onError(err)) {
          throw err;
        }
      }
    }

    json.forEach((item, i) => {
      this.validate({
        json: item,
        schema: schema.items,
        field: `${field}.${i}`,
        onError,
      });
    });
  }
  //  ### LOGICAL ###
  private static validateExtendedLogicalSchema(
    json: any,
    schema: ExtendedLogicalJsonSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    if (schema.anyOf) {
      this.validateAnyOf(json, schema.anyOf, `${field}.anyOf`, onError);
    }
    if (schema.allOf) {
      this.validateAllOf(json, schema.allOf, `${field}.allOf`, onError);
    }
    if (schema.oneOf) {
      this.validateOneOf(json, schema.oneOf, `${field}.oneOf`, onError);
    }
    if (schema.not) {
      this.validateNot(json, schema.not, `${field}.not`, onError);
    }
  }
  private static validateAnyOf(
    json: any,
    schemas: LogicalJsonSchema[],
    field: string,
    onError?: (err: Error) => boolean
  ) {
    const isValid = schemas.some((schema, i) => {
      try {
        this.validate({
          json,
          schema: schema as IJsonSchema,
          field: `${field}.${i}`,
          onError,
        });
        return true;
      } catch {
        return false;
      }
    });

    if (!isValid) {
      const err = new SchemaError(
        `Validation failed for 'anyOf' at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
  }
  private static validateAllOf(
    json: any,
    schemas: (LogicalJsonSchema | ConditionJsonSchema)[],
    field: string,
    onError?: (err: Error) => boolean
  ) {
    schemas.forEach((schema, i) =>
      this.validate({
        json,
        schema: schema as IJsonSchema,
        field: `${field}.${i}`,
        onError,
      })
    );
  }
  private static validateOneOf(
    json: any,
    schemas: LogicalJsonSchema[],
    field: string,
    onError?: (err: Error) => boolean
  ) {
    const validCount = schemas.reduce((count, schema, i) => {
      try {
        this.validate({
          json,
          schema: schema as IJsonSchema,
          field: `${field}.${i}`,
          onError,
        });
        return count + 1;
      } catch {
        return count;
      }
    }, 0);

    if (validCount !== 1) {
      const err = new SchemaError(
        `Validation failed for 'oneOf' at "${field}" (count: ${validCount}).`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    }
  }
  private static validateNot(
    json: any,
    schema: LogicalJsonSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    try {
      this.validate({ json, schema: schema as IJsonSchema, field, onError });
      const err = new SchemaError(
        `Validation failed for 'not' at "${field}".`,
        field
      );
      if (!onError || onError(err)) {
        throw err;
      }
    } catch {
      // If an error is thrown, it means the validation for 'not' passes
    }
  }
  // ### CONDITIONAL ###
  private static validateConditionalSchema(
    json: any,
    schema: ConditionJsonSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    const isBaseCondition = (schema: ConditionJsonSchema) =>
      "if" in schema && "then" in schema && !("else" in schema);

    const isExtendedCondition = (schema: ConditionJsonSchema) =>
      "if" in schema && "then" in schema && "else" in schema;

    if (isBaseCondition(schema)) {
      this.validateBaseCondition(json, schema, field, onError);
    } else if (isExtendedCondition(schema)) {
      this.validateExtendedCondition(json, schema, field, onError);
    }
  }
  private static validateBaseCondition(
    json: any,
    condition: ConditionJsonSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    try {
      this.validate({
        json,
        schema: condition.if as IJsonSchema,
        field: `${field}.if`,
        onError,
      });
    } catch {
      return;
    }
    this.validate({
      json,
      schema: condition.then as IJsonSchema,
      field: `${field}.then`,
      onError,
    });
  }
  private static validateExtendedCondition(
    json: any,
    condition: ConditionJsonSchema,
    field: string,
    onError?: (err: Error) => boolean
  ) {
    try {
      this.validate({
        json,
        schema: condition.if as IJsonSchema,
        field: `${field}.if`,
        onError,
      });
      this.validate({
        json,
        schema: condition.then as IJsonSchema,
        field: `${field}.then`,
        onError,
      });
    } catch (err: any) {
      if ("else" in condition) {
        this.validate({
          json,
          schema: condition.else as IJsonSchema,
          field: `${field}.else`,
          onError,
        });
      }
    }
  }
}
