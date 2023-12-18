import {
  IDataConstructor,
  IDataModel,
  IDataPagingReq,
  IDataUpdReq,
} from "../data";
import { Status } from "./status";

export interface ICrudConstructor extends IDataConstructor {
  schema: any;
}

export interface IModel extends IDataModel {
  status?: Status;
  draft?: number | null;
  enable?: number | null;
  disable?: number | null;
  block?: number | null;
  delete?: number | null;
  star?: number | null;
  userId?: string;
  statusReason?: string | null;
  ver?: number; // version
}

export interface IPagingReq extends IDataPagingReq {
  from?: number;
  to?: number;
  userId: string;
}

export interface IPagingByStatusReq extends IPagingReq {
  status: Status;
}
export interface IPagingRes<T extends IModel> {
  items: T[];
  offset?: string;
}
interface IBaseCountReq {
  status: Status;
  from?: number;
  to?: number;
}
export interface ICountReq extends IBaseCountReq {
  userId: string;
}
interface IBaseExistsReq {
  status: Status;
  from?: number;
  to?: number;
  key: {
    [key: string]: any;
  };
}
export interface IExistsReq extends IBaseExistsReq {
  userId: string;
}
export interface IModelReq<T extends IModel> extends IPersistedReq {
  model: T;
}
export interface IGetByIdReq {
  id: string;
  userId: string;
  fields?: string[];
}
export interface IListByIdsReq {
  ids: string[];
  fields?: string[];
}
export interface IListAllReq {
  fields?: string[];
}
export interface IListAllByStatusReq {
  status: Status;
  from?: number;
  to?: number;
  asc?: boolean;
  fields?: string[];
}
interface IBaseListReq {
  from?: number;
  to?: number;
  asc?: boolean;
  fields?: string[];
}
export interface IListReq extends IBaseListReq {
  userId: string;
}
export interface IListByStatusReq extends IListReq {
  status: Status;
}
interface IBasePersistedReq {
  id: string;
}
export interface IPersistedReq extends IBasePersistedReq {
  userId: string;
}
export interface IStatusReq extends IPersistedReq {
  reason?: string | null;
}
export interface ICreateByBatch<T extends IModel> {
  items: T[];
  userId: string;
}
export interface IUpdReq<T extends IModel> extends IDataUpdReq<T> {
  userId: string;
}
export interface IPageAllByStatusReq extends IDataPagingReq {
  status: Status;
  from?: number;
  to?: number;
}
