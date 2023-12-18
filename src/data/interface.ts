export interface IDataModel {
  id: string;
  create?: number;
  createBy?: string;
  update?: number;
  updateBy?: string;
  log?: string;
}
export interface ISortFilter {
  name: string;
  from?: number | string;
  to?: number | string;
}

export interface IBasePagingReq {
  limit?: number;
  fields?: string[];
  offset?: string;
  asc?: boolean;
}

export interface IPagingReq extends IBasePagingReq {
  key: {
    [key: string]: any;
  };
  index?: string;
  sort?: ISortFilter;
}
export interface IPagingRes<T extends IDataModel> {
  items: T[];
  offset?: string;
}
export interface IGetByIdReq {
  id: string;
  fields?: string[];
}
export interface ICountReq {
  key: {
    [key: string]: any;
  };
  index?: string;
  sort?: ISortFilter;
}
export interface IExistsReq {
  key: {
    [key: string]: any;
  };
  index?: string;
  sort?: ISortFilter;
}
export interface IGetReq {
  key: {
    [key: string]: any;
  };
  index?: string;
  sort?: ISortFilter;
  fields?: string[];
  asc?: boolean;
}
export interface IListByIdsReq {
  ids: string[];
  fields?: string[];
}
export interface IListReq {
  key: {
    [key: string]: any;
  };
  index?: string;
  sort?: ISortFilter;
  fields?: string[];
  asc?: boolean;
  limit?: number;
}
export interface IListAllReq {
  index?: string;
  fields?: string[];
}
export interface IModelReq<T extends IDataModel> extends IPersistedReq {
  model: T;
  condition?: string;
  values?: { [key: string]: any };
  names?: { [key: string]: string };
}
export interface IUpdReq<T extends IDataModel> extends IModelReq<T> {
  setExps?: string[];
  delExps?: string[];
}

export interface IDelByIdReq extends IPersistedReq {
  condition?: string;
  values?: { [key: string]: any };
}
export interface IPersistedReq {
  id: string;
}
