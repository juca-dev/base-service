import {
  IModel,
  IPagingReq,
  ICountReq,
  IPersistedReq,
  IModelReq,
  IPagingRes,
  IGetByIdReq,
  ICrudConstructor,
  ICreateByBatch,
  IListByIdsReq,
  IListAllReq,
  IStatusReq,
  IUpdReq,
  IListReq,
  IListByStatusReq,
  IListAllByStatusReq,
  IPagingByStatusReq,
  IPageAllByStatusReq,
} from "./interface";
import DataService, { IDataPagingReq } from "../data";
import { Status, StatusConvert } from "./status";
import {
  DATA_EMPTY,
  ENABLED_REQUIRED,
  ID_EXISTS,
  SCHEMA_ERROR,
  USER_FORBIDDEN,
} from "../error";
import { SchemaError, SchemaService } from "../schema";

export {
  IModel as ICrudModel,
  IModelReq as ICrudReq,
  IPersistedReq as ICrudPersistedReq,
  Status as CrudStatus,
};

export default abstract class CrudService<
  T extends IModel
> extends DataService<T> {
  private readonly schema: any;
  protected constructor({ id, emitter, schema }: ICrudConstructor) {
    super({ id, emitter });
    this.schema = schema;
  }

  protected encodeId(id: string) {
    return Buffer.from(id).toString("base64").replace(/=/g, "");
  }

  public validate(model: T, required: boolean = true, ignore?: boolean) {
    if (!model) {
      throw DATA_EMPTY;
    }
    const schema = { ...this.schema };
    if (!required) {
      delete schema.required;
    }

    try {
      const onError = (err: Error) => {
        // ignore string lengths
        if (
          ignore &&
          ["minLength", "maxLength"].some((e) => err.message.includes(e))
        ) {
          return false;
        }
        // treat field date (min/max), save as string
        if (
          err.message.startsWith("Expected a number at") &&
          err.message.includes(".form.fields.")
        ) {
          return false;
        }

        return true;
      };

      SchemaService.validate({
        json: model as any,
        schema,
        onError,
      });
    } catch (err: any) {
      if (typeof err === typeof SchemaError) {
        throw SCHEMA_ERROR((err as SchemaError).field, err.message);
      }
      throw err;
    }
  }

  protected setNewModel(model: T, userId?: string): T {
    const time = model.create || Date.now();
    const status = model.status || Status.DRAFT;
    const statusKey = StatusConvert.toString(status);

    const res = {
      ...model,
      // never set status
      block: undefined,
      delete: undefined,
      draft: undefined,
      disable: undefined,
      enable: undefined,
      updateBy: undefined,
      update: undefined,
      status,
      create: time,
      ver: 0, // version
      [statusKey]: time,
    };
    if (userId) {
      res.userId = userId;
      res.createBy = userId;
    }

    return res;
  }
  protected setUpdModel(model: T, userId?: string): T {
    const time = model.update || Date.now();

    const res = {
      ...model,
      update: time,
      // never set on update
      create: undefined,
      createBy: undefined,
      userId: undefined,
      status: undefined,
      block: undefined,
      delete: undefined,
      draft: undefined,
      disable: undefined,
      enable: undefined,
      ver: undefined,
    };
    if (userId) {
      res.updateBy = userId;
    }

    return res;
  }

  async pageByStatus({
    userId,
    status = Status.ENABLED,
    from,
    to,
    asc,
    limit,
    offset,
    fields,
  }: IPagingByStatusReq): Promise<IPagingRes<T>> {
    const statusKey = StatusConvert.toString(status);

    const res = await super.pageItems({
      index: `userId-${statusKey}`,
      key: {
        userId,
      },
      sort: {
        name: statusKey,
        from,
        to,
      },
      asc,
      limit,
      offset,
      fields,
    });

    return res;
  }
  async page({
    userId,
    asc,
    limit,
    offset,
    fields,
  }: IPagingReq): Promise<IPagingRes<T>> {
    const res = await super.pageItems({
      index: "userId",
      key: {
        userId,
      },
      asc,
      limit,
      offset,
      fields,
    });

    return res;
  }
  async count(userId: string): Promise<number> {
    const res = await super.countItems({
      index: "userId",
      key: {
        userId,
      },
    });

    return res;
  }
  async countByStatus({
    status = Status.ENABLED,
    from = 0,
    to,
    userId,
  }: ICountReq): Promise<number> {
    const statusKey = StatusConvert.toString(status);

    const res = await super.countItems({
      index: `userId-${statusKey}`,
      key: {
        userId,
      },
      sort: {
        name: statusKey,
        from,
        to,
      },
    });

    return res;
  }
  async create({ id, model, userId }: IModelReq<T>): Promise<T> {
    this.validate(model, true, true); // TODO: on create ignore validation

    const res = this.setNewModel(model, userId);
    try {
      await super.createItem({
        id,
        model: res,
      });
      return { ...res, id };
    } catch (err) {
      this.log.debug(err);
      throw ID_EXISTS;
    }
  }
  async putById({ id, model, userId }: IModelReq<T>): Promise<T> {
    this.validate(model);

    const res = this.setNewModel(model, userId);
    try {
      await super.putItem({
        id,
        model: res,
      });
      return { ...res, id };
    } catch (err) {
      this.log.debug(err);
      throw ID_EXISTS;
    }
  }
  async getById({ id, fields, userId }: IGetByIdReq): Promise<T | undefined> {
    const res = await super.getItemById({
      id,
      fields: fields?.length ? [...fields, "userId"] : undefined,
    });
    if (!res) {
      return undefined;
    }

    if (res.userId !== userId) {
      throw USER_FORBIDDEN;
    }

    return res;
  }
  async existsById({ id, userId }: IGetByIdReq): Promise<boolean> {
    const res = await super.getItemById({
      id,
      fields: ["userId"],
    });
    if (!res) {
      return false;
    }

    if (res.userId !== userId) {
      throw USER_FORBIDDEN;
    }

    return true;
  }
  async updById(
    { id, model, userId }: IModelReq<T>,
    inc = 1
  ): Promise<T | undefined> {
    this.validate(model);

    const res = this.setUpdModel(model, userId);
    try {
      await super.updItemById({
        id,
        model: res,
        values: {
          ":inc": inc,
        },
        setExps: ["ver=ver+:inc"],
      });
      return { ...res, id };
    } catch (err) {
      this.log.debug(err);
      return undefined;
    }
  }
  async delById({ id, userId }: IPersistedReq): Promise<boolean> {
    try {
      await super.delItemById({
        id,
        values: {
          ":userId": userId,
        },
        condition: `userId=:userId`,
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async setById(
    { id, model, userId }: IModelReq<T>,
    inc = 1
  ): Promise<boolean> {
    this.validate(model, false, true); // TODO: remove ignore
    try {
      await super.updItemById({
        id,
        model: this.setUpdModel(model, userId),
        condition: `userId=:updateBy`,
        values: {
          ":inc": inc,
        },
        setExps: ["ver=ver+:inc"],
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async blockById({ id, reason = null, userId }: IStatusReq): Promise<boolean> {
    try {
      await super.updItemById({
        id,
        model: {
          status: Status.BLOCKED,
          block: Date.now(),
          delete: null,
          draft: null,
          disable: null,
          enable: null,
          statusReason: reason,
        } as any,
        values: {
          ":userId": userId,
        },
        condition: "userId=:userId AND #status<>:status",
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async unblockById({ id, userId }: IStatusReq): Promise<boolean> {
    try {
      await super.updItemById({
        id,
        model: {
          status: Status.ENABLED,
          block: null,
          delete: null,
          draft: null,
          disable: null,
          enable: Date.now(),
          statusReason: null,
        } as any,
        values: {
          ":userId": userId,
          ":blocked": Status.BLOCKED,
        },
        condition: "userId=:userId AND #status=:blocked",
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async disableById({ id, userId }: IPersistedReq): Promise<boolean> {
    try {
      await super.updItemById({
        id,
        model: {
          status: Status.DISABLED,
          block: null,
          delete: null,
          draft: null,
          disable: Date.now(),
          enable: null,
        } as any,
        values: {
          ":userId": userId,
          ":enabled": Status.ENABLED,
        },
        condition: "userId=:userId AND #status=:enabled",
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async enableById({ id, userId }: IPersistedReq): Promise<boolean> {
    try {
      await super.updItemById({
        id,
        model: {
          status: Status.ENABLED,
          block: null,
          delete: null,
          draft: null,
          disable: null,
          enable: Date.now(),
          statusReason: null,
        } as any,
        values: {
          ":userId": userId,
          ":draft": Status.DRAFT,
          ":disabled": Status.DISABLED,
        },
        condition: "userId=:userId AND (#status=:draft OR #status=:disabled)",
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async archiveById({ id, userId }: IPersistedReq): Promise<boolean> {
    try {
      await super.updItemById({
        id,
        model: {
          status: Status.DELETED,
          block: null,
          delete: Date.now(),
          draft: null,
          disable: null,
          enable: null,
        } as any,
        values: {
          ":userId": userId,
          ":draft": Status.DRAFT,
          ":enabled": Status.ENABLED,
          ":disabled": Status.DISABLED,
        },
        condition:
          "userId=:userId AND (#status=:draft OR #status=:enabled OR #status=:disabled)",
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async restoreById({ id, userId }: IPersistedReq): Promise<boolean> {
    try {
      await super.updItemById({
        id,
        model: {
          status: Status.DRAFT,
          block: null,
          delete: null,
          draft: Date.now(),
          disable: null,
          enable: null,
          statusReason: null,
        } as any,
        values: {
          ":userId": userId,
          ":deleted": Status.DELETED,
        },
        condition: "userId=:userId AND #status=:deleted",
      });
      return true;
    } catch (err) {
      this.log.debug(err);
      return false;
    }
  }
  async createByBatch({ items, userId }: ICreateByBatch<T>) {
    this.log.debug("IN createByBatch");
    const trans = items.map((e) =>
      this.createTrans({
        id: e.id,
        model: e,
        userId,
      })
    );

    await super.transWriteItems(trans);
    this.log.debug("OUT createByBatch");
  }
  async listByIds({ ids, fields }: IListByIdsReq): Promise<T[]> {
    const res = await super.listItemsByIds({ ids, fields });

    return res;
  }
  async listAll({ fields }: IListAllReq): Promise<T[]> {
    const res = await super.listAllItems({ fields });

    return res;
  }
  async listByStatus({
    status = Status.ENABLED,
    from,
    to,
    asc,
    fields,
    userId,
  }: IListByStatusReq): Promise<T[]> {
    const statusKey = StatusConvert.toString(status);

    const res = await super.listItems({
      index: `userId-${statusKey}`,
      key: {
        userId,
      },
      sort: {
        name: statusKey,
        from,
        to,
      },
      asc,
      fields,
    });

    return res;
  }
  async list({ userId, fields }: IListReq): Promise<T[]> {
    const res = await super.listItems({
      index: "userId",
      key: {
        userId,
      },
      fields,
    });

    return res;
  }
  async listAllByStatus({
    status,
    fields,
    from,
    to,
    asc,
  }: IListAllByStatusReq): Promise<T[]> {
    const statusKey = StatusConvert.toString(status);

    const res = await super.listItems({
      index: statusKey,
      key: {
        status,
      },
      sort: {
        name: statusKey,
        from,
        to,
      },
      fields,
      asc,
    });

    return res;
  }

  protected createTrans({ id, model, userId }: IModelReq<T>) {
    // this.validate(model) // TODO: check the problem to multiple validation
    return super.createTrans({
      id,
      model: this.setNewModel(model, userId),
    });
  }

  protected updTrans({
    id,
    model,
    condition,
    names,
    values,
    setExps,
    delExps,
    userId,
  }: IUpdReq<T>) {
    // this.validate(model) // TODO: check the problem to multiple validation
    return super.updTrans({
      id,
      model: this.setUpdModel(model, userId),
      condition,
      names,
      values,
      setExps,
      delExps,
    });
  }
  async pageAllByStatus({
    status = Status.ENABLED,
    from,
    to,
    asc,
    limit,
    offset,
    fields,
  }: IPageAllByStatusReq): Promise<IPagingRes<T>> {
    const statusKey = StatusConvert.toString(status);

    const res = await super.pageItems({
      index: statusKey,
      key: {
        status,
      },
      sort: {
        name: statusKey,
        from,
        to,
      },
      asc,
      limit,
      offset,
      fields,
    });

    return res;
  }
  async pageAll({
    limit,
    offset,
    fields,
  }: IDataPagingReq): Promise<IPagingRes<T>> {
    const res = await super.pageAllItems({
      limit,
      offset,
      fields,
    });

    return res;
  }
  async moveById(
    moveId: string,
    { id, userId }: IPersistedReq
  ): Promise<IModel> {
    const current = await super.getItemById({
      id,
    });
    if (!current || current.userId !== userId) {
      throw USER_FORBIDDEN;
    }
    if (current.status !== Status.ENABLED) {
      throw ENABLED_REQUIRED;
    }
    const model = { ...current, id: moveId };
    try {
      await super.createItem({ id: moveId, model });
    } catch (err) {
      this.log.debug(err);
      throw ID_EXISTS;
    }
    await this.archiveById({ id, userId });
    return model;
  }
}
