import { STATUS_INVALID } from "../error";

enum Status {
  NONE = 0,
  DRAFT = 1,
  ENABLED = 2,
  DISABLED = 3,
  DELETED = 4,
  BLOCKED = 5,
  ERROR = 99,
}

class StatusConvert {
  static toString(id: Status) {
    switch (id) {
      case Status.DELETED:
        return "delete";
      case Status.DISABLED:
        return "disable";
      case Status.DRAFT:
        return "draft";
      case Status.ENABLED:
        return "enable";
      case Status.BLOCKED:
        return "block";
      // case Status.NONE:
      //     return 'none'
      // case Status.ERROR:
      //     return 'error'
      default:
        throw STATUS_INVALID;
    }
  }
}

export { Status, StatusConvert };
