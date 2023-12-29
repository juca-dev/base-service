import {
  BatchGetItemCommandInput,
  DeleteItemCommandInput,
  DynamoDB,
  GetItemCommandInput,
  PutItemCommandInput,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput,
  TransactGetItem,
  TransactGetItemsCommandOutput,
  TransactWriteItem,
  Update,
} from "@aws-sdk/client-dynamodb";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";

import {
  IDataModel,
  IPagingReq,
  ICountReq,
  IPersistedReq,
  IModelReq,
  IListReq,
  ISortFilter,
  IExistsReq,
  IGetReq,
  IPagingRes,
  IListAllReq,
  IListByIdsReq,
  IGetByIdReq,
  IDelByIdReq,
  IUpdReq,
  IBasePagingReq,
} from "./interface";
import { BaseService, IBaseConstructor } from "../base";

const ddb = new DynamoDB();

export {
  IDataModel,
  IBaseConstructor as IDataConstructor,
  IUpdReq as IDataUpdReq,
  IBasePagingReq as IDataPagingReq,
  IGetByIdReq as IDataGetByIdReq,
};

export default abstract class DataService<
  T extends IDataModel
> extends BaseService {
  private readonly table: string;
  private readonly cache: {
    [key: string]: any;
  };
  protected constructor({ id, emitter }: IBaseConstructor) {
    super({ id, emitter });
    this.table = `${this.app}.${id}`;
    this.cache = {};
  }

  private getFields(fields?: string[]): string[] | undefined {
    if (!Array.isArray(fields) || fields.length === 0) {
      return undefined;
    }
    let attr: string | undefined = undefined;
    fields //set all property necessary
      .filter((e) => e.includes("."))
      .forEach((r) => {
        const props = r.split(".");
        const vals: string[] = [];
        props.forEach((p) => {
          vals.push(p);
          attr = vals.join(".");
          if (!fields.includes(attr)) {
            fields.push(attr);
          }
        });
      });
    return fields;
  }
  private getProjs(fields?: string[]) {
    if (!Array.isArray(fields) || fields.length === 0) {
      return {};
    }
    const names: { [key: string]: string } = {};
    const projs: string[] = [];
    fields
      .filter((e) => fields.filter((x) => e.startsWith(`${x}.`)).length === 0)
      .forEach((e, i) => {
        const props = e.split(".");
        const res: string[] = [];
        props.forEach((e, j) => {
          names[`#p${i}x${j}`] = e;
          res.push(`#p${i}x${j}`);
        });
        projs.push(res.join("."));
      });

    return {
      names,
      values: projs.length ? projs.join(",") : undefined,
    };
  }
  private sort(
    sort: ISortFilter,
    names: { [key: string]: string },
    values: { [key: string]: any }
  ): string[] {
    if (!sort || (sort.from === undefined && sort.to === undefined)) {
      return [];
    }
    const conds: string[] = [];
    names[`#kr`] = sort.name;
    if (sort.from !== undefined && sort.to !== undefined) {
      if (sort.from === sort.to) {
        values[`:krv`] = sort.to;
        conds.push(`#kr=:krv`);
      } else {
        values[`:krv0`] = sort.from;
        values[`:krv1`] = sort.to;
        conds.push(`#kr BETWEEN :krv0 AND :krv1`);
      }
    } else if (sort.from !== undefined) {
      values[`:krv`] = sort.from;
      conds.push(`#kr>=:krv`);
    } else if (sort.to !== undefined) {
      values[`:krv`] = sort.to;
      conds.push(`#kr<=:krv`);
    } else {
      values[`:krv`] = 0;
      conds.push(`#kr>=:krv`);
    }

    return conds;
  }
  protected async pageItems({
    index,
    key,
    sort,
    asc,
    limit,
    offset,
    fields,
  }: IPagingReq): Promise<IPagingRes<T>> {
    if (limit === 0) {
      return {
        items: [],
      };
    }
    const projs = this.getProjs(fields);
    let names = projs.names || {};
    let values: { [key: string]: any } = {};
    const conds = sort ? this.sort(sort, names, values) : [];

    Object.keys(key).forEach((e, i) => {
      names[`#k${i}`] = e;
      values[`:k${i}`] = key[e];
      conds.push(`#k${i}=:k${i}`);
    });

    const params: QueryCommandInput = {
      TableName: this.table,
      IndexName: index,
      ScanIndexForward: asc === true, //true = ASC | false = DESC
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(values),
      ProjectionExpression: projs.values,
      KeyConditionExpression: conds.join(" AND "),
      Limit: limit,
      ExclusiveStartKey: offset
        ? JSON.parse(Buffer.from(offset, "base64").toString())
        : undefined,
    };
    // super.log('paging: %j', params)
    const res = await ddb.query(params);
    if (!res.Items || res.Items.length === 0) {
      return {
        items: [],
      };
    }

    const items = res.Items?.map((item) => unmarshall(item));

    return {
      items: items as T[],
      offset: res.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString("base64")
        : undefined,
    };
  }

  protected async pageAllItems({
    limit,
    offset,
    fields,
  }: IBasePagingReq): Promise<IPagingRes<T>> {
    if (limit === 0) {
      return {
        items: [],
      };
    }
    const { names, values } = this.getProjs(fields);

    const params: ScanCommandInput = {
      TableName: this.table,
      ExpressionAttributeNames: names,
      ProjectionExpression: values,
      Limit: limit,
      ExclusiveStartKey: offset
        ? JSON.parse(Buffer.from(offset, "base64").toString())
        : undefined,
    };
    // super.log('pagingScan: %j', params)
    const res = await ddb.scan(params);
    if (!res.Items || res.Items.length === 0) {
      return {
        items: [],
      };
    }
    const items = res.Items?.map((item) => unmarshall(item));

    return {
      items: items as T[],
      offset: res.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString("base64")
        : undefined,
    };
  }
  protected async countItems({ index, sort, key }: ICountReq): Promise<number> {
    let names: { [key: string]: string } = {};
    let values: { [key: string]: any } = {};
    const conds = sort ? this.sort(sort, names, values) : [];

    Object.keys(key).forEach((e, i) => {
      names[`#k${i}`] = e;
      values[`:k${i}`] = key[e];
      conds.unshift(`#k${i}=:k${i}`);
    });

    const params: QueryCommandInput = {
      TableName: this.table,
      IndexName: index,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(values),
      KeyConditionExpression: conds.join(" AND "),
      Select: "COUNT",
    };
    // super.log('count: %j', params)
    let count = 0;
    let res: QueryCommandOutput | undefined = undefined;
    do {
      params.ExclusiveStartKey = res?.LastEvaluatedKey;
      res = await ddb.query(params);
      if (res.Count) {
        count += res.Count;
      }
    } while (res.LastEvaluatedKey);
    return count || 0;
  }
  protected async createItem({ id, model, condition }: IModelReq<T>) {
    const params = this.createItemTrans({ id, model, condition });

    await ddb.putItem(params);
  }
  protected async putItem({ id, model }: IModelReq<T>) {
    const params = this.putItemTrans({ id, model });

    await ddb.putItem(params);
  }
  protected async getItemById({
    id,
    fields,
  }: IGetByIdReq): Promise<T | undefined> {
    const params: GetItemCommandInput = {
      TableName: this.table,
      Key: marshall({ id }),
    };
    if (fields && fields.find((e) => e.includes("."))) {
      const projs = this.getProjs(fields);
      params.ExpressionAttributeNames = projs.names;
      params.ProjectionExpression = projs.values;
    } else {
      params.AttributesToGet = this.getFields(fields);
    }

    // super.log('load: %j', params)
    const res = await ddb.getItem(params);
    if (!res.Item) {
      return undefined;
    }
    const item = unmarshall(res.Item);
    return item as T;
  }
  protected async updItemById({
    id,
    model,
    condition,
    values = {},
    names = {},
    setExps,
    delExps,
  }: IUpdReq<T>) {
    const params = this.updItemTrans({
      id,
      model,
      condition,
      values,
      names,
      setExps,
      delExps,
    });

    await ddb.updateItem(params);
  }
  protected async delItemById({ id, values, condition }: IDelByIdReq) {
    const params = this.delItemTrans({ id, values, condition });
    // super.log('delete: %j', params)
    await ddb.deleteItem(params);
  }
  protected async existsItemById({ id }: IPersistedReq): Promise<boolean> {
    const res = await this.getItemById({
      id,
      fields: ["id"],
    });

    return res !== undefined;
  }
  protected async listItemsByIds({ ids, fields }: IListByIdsReq): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const keys = ids
      .filter((e, i) => ids.indexOf(e) === i) //remove duplicated
      .map((e) => marshall({ id: e }));

    const params: BatchGetItemCommandInput = {
      RequestItems: {
        [this.table]: {
          Keys: [],
          AttributesToGet: this.getFields(fields),
        },
      },
    };
    let items: T[] = [];
    while (keys.length && params.RequestItems) {
      params.RequestItems[this.table].Keys = keys.splice(0, 100); //limited 100
      const res = await ddb.batchGetItem(params);
      //supere.log('list: %j', params)
      if (!res.Responses) {
        break;
      }
      items = items.concat(
        res.Responses[this.table].map((e) => unmarshall(e) as T)
      );
    }

    return items;
  }
  protected async existsItems({
    index,
    key,
    sort,
  }: IExistsReq): Promise<boolean> {
    const count = await this.countItems({ index, key, sort });
    return count > 0;
  }
  protected async getItem({
    index,
    key,
    sort,
    asc,
    fields,
  }: IGetReq): Promise<T | undefined> {
    const projs = this.getProjs(fields);
    let names = projs.names || {};
    let values: { [key: string]: any } = {};
    const conds = sort ? this.sort(sort, names, values) : [];

    Object.keys(key).forEach((e, i) => {
      names[`#k${i}`] = e;
      values[`:k${i}`] = key[e];
      conds.push(`#k${i}=:k${i}`);
    });

    const params: QueryCommandInput = {
      TableName: this.table,
      IndexName: index,
      ScanIndexForward: asc === true, //true = ASC | false = DESC
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(values),
      ProjectionExpression: projs.values,
      KeyConditionExpression: conds.join(" AND "),
      Limit: 1,
    };
    //supere.log('getItem: %j', params)
    const res = await ddb.query(params);
    if (!res.Items || res.Items.length === 0) {
      return undefined;
    }
    const item = unmarshall(res.Items[0]);

    return item as T;
  }
  protected async listItems({
    index,
    key,
    sort,
    asc,
    fields,
    limit,
  }: IListReq): Promise<T[]> {
    if (limit === 0) {
      return [];
    }
    const projs = this.getProjs(fields);
    let names = projs.names || {};
    let values: { [key: string]: any } = {};
    const conds = sort ? this.sort(sort, names, values) : [];

    Object.keys(key).forEach((e, i) => {
      names[`#k${i}`] = e;
      values[`:k${i}`] = key[e];
      conds.push(`#k${i}=:k${i}`);
    });

    const params: QueryCommandInput = {
      TableName: this.table,
      IndexName: index,
      ScanIndexForward: asc === true, //true = ASC | false = DESC
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(values),
      ProjectionExpression: projs.values,
      KeyConditionExpression: conds.join(" AND "),
      Limit: limit,
    };
    const kCache = Buffer.from(JSON.stringify(params)).toString("base64");
    if (process.env.DEBUG === "true") {
      if (this.cache[kCache]) {
        this.log.debug("CACHE: %j", params);
        return this.cache[kCache];
      }
    }
    // super.log('listItems: %j', params)
    let items: T[] = [];
    let res: QueryCommandOutput | undefined = undefined;
    do {
      params.ExclusiveStartKey = res?.LastEvaluatedKey;
      res = await ddb.query(params);
      if (res.Items?.length) {
        items = items.concat(res.Items.map((e) => unmarshall(e) as T));

        if (limit && items.length >= limit) {
          break;
        }
      }
    } while (res.LastEvaluatedKey);

    if (limit) {
      items.splice(limit);
    }

    if (process.env.DEBUG === "true") {
      this.cache[kCache] = items;
    }

    return items;
  }
  protected async listAllItems({ index, fields }: IListAllReq): Promise<T[]> {
    const { names, values } = this.getProjs(fields);

    const params: ScanCommandInput = {
      TableName: this.table,
      IndexName: index,
      ExpressionAttributeNames: names,
      ProjectionExpression: values,
    };
    //supere.log('getItem: %j', params)
    let items: T[] = [];
    let res: ScanCommandOutput | undefined = undefined;
    do {
      params.ExclusiveStartKey = res?.LastEvaluatedKey;
      res = await ddb.scan(params);
      if (res.Items?.length) {
        items = items.concat(res.Items.map((e) => unmarshall(e) as T));
      }
    } while (res.LastEvaluatedKey);

    return items;
  }

  private createItemTrans({ id, model, condition }: IModelReq<T>) {
    const res: PutItemCommandInput = {
      TableName: this.table,
      Item: marshall(
        {
          ...model,
          id,
        },
        { removeUndefinedValues: true }
      ),
      ConditionExpression: condition
        ? `attribute_not_exists(id) AND ${condition}`
        : "attribute_not_exists(id)",
    };
    return res;
  }
  private putItemTrans({ id, model }: IModelReq<T>) {
    const res: PutItemCommandInput = {
      TableName: this.table,
      Item: marshall(
        {
          ...model,
          id,
        },
        { removeUndefinedValues: true }
      ),
    };
    return res;
  }
  protected createTrans({ id, model, condition }: IModelReq<T>) {
    const res: TransactWriteItem = {
      Put: this.createItemTrans({ id, model, condition }),
    };
    return res;
  }
  private updItemTrans({
    id,
    model,
    condition,
    names = {},
    values = {},
    setExps,
    delExps,
  }: IUpdReq<T>) {
    const toSet: string[] = setExps || [];
    const toDel: string[] = delExps || [];
    let k;
    for (let e in model) {
      const val = model[e];
      if (val === undefined) {
        //ignore
        continue;
      }
      k = `#${e}`;
      names[k] = e;
      if (val === null || (Array.isArray(val) && val.length === 0)) {
        toDel.push(k);
      } else {
        const kv = `:${e}`;
        values[kv] = val;
        toSet.push(`${k}=${kv}`);
      }
    }
    let exp = "";
    if (toSet.length) {
      exp += ` SET ${toSet.join(",")}`;
    }
    if (toDel.length) {
      exp += ` REMOVE ${toDel.join(",")}`;
    }
    exp = exp.trim();

    const res: Update = {
      TableName: this.table,
      Key: marshall({ id }),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: Object.keys(values).length
        ? marshall(values, { removeUndefinedValues: true })
        : undefined,
      UpdateExpression: exp,
      ConditionExpression: condition
        ? `attribute_exists(id) AND ${condition}`
        : "attribute_exists(id)",
      ReturnValuesOnConditionCheckFailure: "NONE", //ALL_NEW, ALL_OLD, NONE
    };
    // super.log('update: %j', res)

    return res;
  }
  protected updTrans({
    id,
    model,
    condition,
    names,
    values,
    setExps,
    delExps,
  }: IUpdReq<T>) {
    const res: TransactWriteItem = {
      Update: this.updItemTrans({
        id,
        model,
        condition,
        names,
        values,
        setExps,
        delExps,
      }),
    };
    return res;
  }
  private delItemTrans({ id, values, condition }: IDelByIdReq) {
    const res: DeleteItemCommandInput = {
      TableName: this.table,
      Key: marshall({ id }),
      ExpressionAttributeValues: marshall(values, {
        removeUndefinedValues: true,
      }),
      ConditionExpression: condition
        ? `attribute_exists(id) AND ${condition}`
        : "attribute_exists(id)",
    };
    return res;
  }
  protected delByIdTrans({ id, values, condition }: IDelByIdReq) {
    const res: TransactWriteItem = {
      Delete: this.delItemTrans({ id, values, condition }),
    };
    return res;
  }
  protected getByIdTrans({ id, fields }: IGetByIdReq) {
    const params: GetItemCommandInput = {
      TableName: this.table,
      Key: marshall({ id }),
    };
    if (fields && fields.length) {
      const projs = this.getProjs(fields);
      params.ExpressionAttributeNames = projs.names;
      params.ProjectionExpression = projs.values;
    }

    return { Get: params };
  }
  protected async transWriteItems(
    items: TransactWriteItem[]
  ): Promise<boolean[]> {
    this.log.debug(`IN transWriteItems(${items.length})`);

    const limit = 25; // dynamo limit
    let index = 0;
    try {
      const pending = [...items];
      while (pending.length) {
        this.log.debug(`pending ${pending.length}`);
        await ddb.transactWriteItems({
          TransactItems: pending.splice(0, limit),
        });
        index += limit;
      }

      return Array.from({ length: items.length }, (_) => true); // true to success
    } catch (err: any) {
      this.log.debug(err);
      if (
        err?.message &&
        (err.message.includes("ConditionalCheckFailed") ||
          err.message.includes("TransactionConflict"))
      ) {
        const conditions: string[] = err.message.match(
          /None|ConditionalCheckFailed|TransactionConflict/g
        );
        const res = Array.from({ length: index }, (_) => true);
        return res.concat(conditions.map((e) => ["None"].includes(e))); // false to failed
      }
      throw err;
    } finally {
      this.log.debug(`OUT transWriteItems(${items.length})`);
    }
  }
  protected async transGetItems(items: TransactGetItem[]) {
    this.log.debug(`IN transGetItems(${items.length})`);
    const fns: Promise<TransactGetItemsCommandOutput>[] = [];
    while (items.length) {
      const fn = ddb.transactGetItems({
        TransactItems: items.splice(0, 25), //limit 25
      });
      fns.push(fn);
    }
    const res = await Promise.all(fns);
    this.log.debug(`OUT transGetItems(${items.length})`);

    return res.reduce((arr: T[], val) => {
      if (!val.Responses) {
        return arr;
      }
      return [
        ...arr,
        ...val.Responses.map((e) => unmarshall(e.Item ?? {}) as T),
      ];
    }, []);
  }

  protected async delByIds(ids: string[]) {
    this.log.debug("IN delByIds");
    const trans = ids.map((id) =>
      this.delByIdTrans({
        id,
      })
    );

    await this.transWriteItems(trans);
    this.log.debug("OUT delByIds");
  }
}
