import { LogLevel } from "./logger";

export enum ComposerApiVersion {
  v1 = "v1",
}

/** @deprecated Use ComposerApiVersion instead. */
export const DodgeballApiVersion = ComposerApiVersion;
/** @deprecated Use ComposerApiVersion instead. */
export type DodgeballApiVersion = ComposerApiVersion;

export enum VerificationStatus {
  PENDING = "PENDING",
  BLOCKED = "BLOCKED",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
}

export enum VerificationOutcome {
  APPROVED = "APPROVED",
  DENIED = "DENIED",
  PENDING = "PENDING",
  ERROR = "ERROR",
}

export interface IVerification {
  id: string;
  status: VerificationStatus;
  outcome: VerificationOutcome;
  stepData: IVerificationStepData;
  nextSteps: IVerificationStep[];
  error?: string;
}

export enum VerificationErrorType {
  SYSTEM = "SYSTEM",
  TIMEOUT = "TIMEOUT",
  CANCELLED = "CANCELLED",
}

export interface IVerificationError {
  errorType: VerificationErrorType;
  details?: string;
}

export const systemError = (errorText?: string) => {
  return {
    errorType: VerificationErrorType.SYSTEM,
    details: errorText,
  };
};

export const cancelError = () => {
  return {
    errorType: VerificationErrorType.CANCELLED,
    details: "The user cancelled their request.",
  };
};

export interface IVerificationContext {
  onVerified: (verification: IVerification) => Promise<void>;
  onApproved: (verification: IVerification) => Promise<void>;
  onDenied?: (verification: IVerification) => Promise<void>;
  onPending?: (verification: IVerification) => Promise<void>;
  onBlocked?: (verification: IVerification) => Promise<void>;
  onUndecided?: (verification: IVerification) => Promise<void>;
  onError?: (error: IVerificationError) => Promise<void>;
}

export interface ILibConfig {
  name: string;
  url: string;
  config: any;
  method?: string;
  content?: {
    url?: string;
    text?: string;
  };
  loadTimeout?: number;
}

export interface IVerificationStep extends ILibConfig {
  id: string;
  verificationStepId: string;
}

export interface IVerificationStepData {
  customMessage?: string;
}

export interface IStepResponse {
  pluginName: string;
  methodName: string;
  data?: any;
}

export interface IInitConfig {
  requestId: string;
  libs: ILibConfig[];
}

export interface IFingerprint {
  source: string;
  props: { [key: string]: any };
  hash?: string;
  error?: string;
}

export enum IntegrationPurpose {
  IDENTIFY = "IDENTIFY",
  OBSERVE = "OBSERVE",
  QUALIFY = "QUALIFY",
  EXECUTE = "EXECUTE",
}

export interface IIntegrationConfig {
  [key: string]: any;
}

export interface IReconfigureIntegrationProps {
  config: IIntegrationConfig;
  url: string;
  purposes?: IntegrationPurpose[];
  requestId: string;
}

export interface IIntegrationProps {
  config: IIntegrationConfig;
  url: string;
  name: string;
  purposes: IntegrationPurpose[];
  requestId: string;
}

export interface IIdentifierIntegration {
  identify(): Promise<IFingerprint>;
  getMetadata(): Promise<{ name: string; metadata: any }>;
}

interface IObserveParams {
  sessionId: string;
  userId?: string;
  sourceToken?: string;
}

export interface IObserverIntegration {
  observe(params: IObserveParams): void;
}

export interface IExecutionIntegration {
  execute(
    step: IVerificationStep,
    context: IVerificationContext,
    responseCallback: (stepResponse: IStepResponse) => Promise<void>,
    onCancel: () => Promise<void>
  ): Promise<any>;
  cleanup(): Promise<void>;
}

export interface IQualifierIntegration {
  qualify(context: IVerificationContext): Promise<any>;
}

export interface IComposerApiError {
  code: number;
  message: string;
}

export interface IComposerTrackResponse {
  success: boolean;
  errors: IComposerApiError[];
  version: ComposerApiVersion;
}

export interface IComposerVerifyResponse {
  success: boolean;
  errors: IComposerApiError[];
  version: ComposerApiVersion;
  verification: IVerification;
}

export interface IComposerConfig {
  apiVersion?: ComposerApiVersion; // Defaults to v1.
  apiUrl?: string; // For completely isolated (self-hosted) distributions, you will need to supply a URL to the API.
  logLevel?: LogLevel | "TRACE" | "INFO" | "ERROR" | "NONE";
  disableCookies?: boolean;
  sessionId?: string; // If you have the sessionId available at the time of construction, you can pass it in here.
  userId?: string; // If you have the userId available at the time of construction, you can pass it in here. Note that sessionId is required if you pass in userId.
  isEnabled?: boolean; // Defaults to true. Set to false to during local development / testing to skip making requests.
  /** @deprecated Current versions of Chrome, Firefox and Safari keep a third-party iframe's storage separate for each site, so this no longer shares a session between sites. It will be removed in a future major version. */
  enableCrossDomainSession?: boolean;
  integrationTimeout?: number; // Defaults to 2000 (2 seconds). This is the timeout for each integration to complete.
}

/** @deprecated Use IComposerConfig instead. */
export type IDodgeballConfig = IComposerConfig;

// This represents the properties on the parent context passed to each integration
export interface IComposerParentContext {
  publicKey: string;
  config: IComposerConfig;
  clearScreen: () => void;
}

export interface IHandleVerificationOptions {
  maxDuration: number;
}

export interface IVerificationInvocationOptions
  extends IHandleVerificationOptions {
  pollingInterval: number;
  numAtInitialPollingInterval: number;
  maxPollingInterval: number;
}

// Errors
export class ComposerMissingConfigError extends Error {
  constructor(configName: string, value: any) {
    super(
      `Composer SDK Error\nMissing configuration: ${configName}\nProvided Value: ${value}`
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ComposerInvalidConfigError extends Error {
  constructor(configName: string, value: any, allowedValues: any[]) {
    super(
      `Composer SDK Error\nInvalid configuration: ${configName}\nProvided value: ${value}\nAllowed values: ${allowedValues.join(
        ", "
      )}`
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ComposerMissingParameterError extends Error {
  constructor(parameter: string, value: any) {
    super(
      `Composer SDK Error\nMissing parameter: ${parameter}\nProvided value: ${value}`
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
