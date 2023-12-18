export const ENV_REQUIRED = (name: string) => ({
  code: "ENV_REQUIRED",
  message: `Environment "${name}" is required!`,
});
export const ENABLED_REQUIRED = {
  code: "ENABLED_REQUIRED",
  message: "Ops! O registro deve estar ativado para prosseguir.",
};
export const DATA_EMPTY = {
  code: "DATA_EMPTY",
  message: "Ops! Não há dados.",
};
export const ID_EXISTS = {
  code: "ID_EXISTS",
  message: "Ops! ID já existe.",
};
export const SCHEMA_ERROR = (field?: string, message?: String) => ({
  code: "SCHEMA_ERROR",
  field,
  message,
});
export const USER_FORBIDDEN = {
  code: "USER_FORBIDDEN",
  message: "Ops! Você não tem acesso.",
};
export const STATUS_INVALID = {
  code: "STATUS_INVALID",
  message: "Ops! Este status é inválido.",
};
