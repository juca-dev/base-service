interface ILogReq {
  app: string;
  message: string;
  data: any;
  userId?: string;
}
export interface ILogErrorReq extends ILogReq {}
export interface ILogInfoReq extends ILogReq {}
export interface ILogWarnReq extends ILogReq {}

export interface IUserNotificationReq {
  userId: string;
  notificationId: string;
  data: any;
}

interface IRecord {
  Sns: {
    MessageId: string;
    Message: string;
    TopicArn: string;
  };
}
export interface IEvent {
  Records: IRecord[];
}
