import {
  ComposerApiVersion,
  IComposerConfig,
  IVerificationInvocationOptions,
} from "./types";

export const MIN_TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
export const MAX_INTEGRATION_LOAD_TIMEOUT = 2 * 1000; // 10 seconds

export const DEFAULT_CONFIG: IComposerConfig = {
  apiUrl: "https://api.dodgeballhq.com/",
  apiVersion: ComposerApiVersion.v1,
  isEnabled: true,
  enableCrossDomainSession: false,
};

export const DEFAULT_VERIFICATION_OPTIONS: IVerificationInvocationOptions = {
  maxDuration: 24 * 60 * 60 * 1000, // Wait 24 hrs before failing
  pollingInterval: 200,
  numAtInitialPollingInterval: 3, // How many times at the initial polling interval to try before using exponential back-off
  maxPollingInterval: 3 * 1000, // 3 seconds
};

export const DISABLED_SOURCE_TOKEN = "DISABLED_SOURCE_TOKEN";
export const DISABLED_SESSION_ID = "DISABLED_SESSION_ID";

export enum ComposerSessionMessageType {
  GET_SESSION = "_DB_GET",
  GET_SESSION_RESPONSE = "_DB_GET_RESPONSE",
  SET_SESSION = "_DB_SET",
  CLEAR_SESSION = "_DB_CLEAR",
}

export const COMPOSER_SESSION_KEY = "_db_s";
