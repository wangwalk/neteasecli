import type { ApiResponse, ApiError } from '../types/index.js';

let prettyPrint = false;
let quietMode = false;

export function setPrettyPrint(value: boolean): void {
  prettyPrint = value;
}

export function setQuietMode(value: boolean): void {
  quietMode = value;
}

export function output<T>(data: T): void {
  if (quietMode) return;

  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };

  console.log(prettyPrint ? JSON.stringify(response, null, 2) : JSON.stringify(response));
}

export function outputError(code: string, message: string): void {
  if (quietMode) return;

  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: { code, message },
  };

  console.log(prettyPrint ? JSON.stringify(response, null, 2) : JSON.stringify(response));
}

export function outputRaw<T>(data: T): void {
  if (quietMode) return;
  console.log(prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data));
}
