import {
  Composer,
  Dodgeball,
  useComposer,
  useDodgeball,
} from "../src/Composer";
import { LogLevel } from "../src/logger";
import * as utilities from "../src/utilities";
import {
  ComposerApiVersion,
  ComposerInvalidConfigError,
  ComposerMissingConfigError,
  DodgeballApiVersion,
  IDodgeballConfig,
  IVerification,
  VerificationOutcome,
  VerificationStatus,
} from "../src/types";

describe("constructor", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should require an API key", () => {
    expect(() => {
      new Composer("");
    }).toThrow(ComposerMissingConfigError);
  });

  test("should only require an API key", () => {
    jest.spyOn(utilities, "getInitializationConfig").mockResolvedValue(null as any);
    let composer = new Composer("test-public-key");
    expect(composer).toBeInstanceOf(Composer);
  });

  test("should accept a valid config object", () => {
    let composer = new Composer("test-public-key", {
      apiVersion: ComposerApiVersion.v1,
      apiUrl: "https://api.dodgeballhq.com/",
      logLevel: LogLevel.ERROR,
      isEnabled: false,
    });

    expect(composer).toBeInstanceOf(Composer);
  });

  test("should accept a config without apiVersion and a log level string", () => {
    const composer = new Composer("test-public-key", {
      apiUrl: "https://api.dodgeballhq.com/",
      logLevel: "ERROR",
      isEnabled: false,
    });

    expect((composer as any).config.apiVersion).toBe(ComposerApiVersion.v1);
  });

  test("should default an undefined apiVersion to v1", () => {
    const composer = new Composer("test-public-key", {
      apiVersion: undefined,
      isEnabled: false,
    });

    expect((composer as any).config.apiVersion).toBe(ComposerApiVersion.v1);
  });

  test("should fail with an invalid apiVersion in config object", () => {
    expect(() => {
      new Composer("test-public-key", {
        apiVersion: "invalid" as any,
      });
    }).toThrow(ComposerInvalidConfigError);
  });

  test("should fail with an invalid logLevel in the config object", () => {
    expect(() => {
      new Composer("test-public-key", {
        apiVersion: ComposerApiVersion.v1,
        logLevel: "invalid" as any,
      });
    }).toThrow(ComposerInvalidConfigError);
  });
});

describe("Dodgeball fallbacks", () => {
  // isEnabled: false skips the constructor's init config request
  const config = {
    apiVersion: ComposerApiVersion.v1,
    logLevel: LogLevel.NONE,
    isEnabled: false,
  };

  afterEach(() => {
    delete (globalThis as any).window;
  });

  test("old names are aliases of the new names", () => {
    expect(Dodgeball).toBe(Composer);
    expect(useDodgeball).toBe(useComposer);
    expect(DodgeballApiVersion).toBe(ComposerApiVersion);
  });

  test("new Dodgeball() creates a Composer", () => {
    expect(new Dodgeball("test-public-key", config)).toBeInstanceOf(Composer);
  });

  test("old type names still compile", () => {
    const d: Dodgeball | null = new Composer("test-public-key", config);
    const c: IDodgeballConfig = { apiVersion: DodgeballApiVersion.v1 };
    expect(d).not.toBeNull();
    expect(c.apiVersion).toBe(ComposerApiVersion.v1);
  });

  test("index sets window.Composer and window.Dodgeball", () => {
    (globalThis as any).window = {};

    jest.isolateModules(() => {
      const index = require("../src/index");
      expect((globalThis as any).window.Composer).toBe(index.Composer);
      expect((globalThis as any).window.Dodgeball).toBe(index.Composer);
    });
  });

  test("useComposer stores the instance on window.composer and reuses it", () => {
    (globalThis as any).window = {};

    const first = useComposer("test-public-key", config);
    const second = useComposer("test-public-key", config);

    expect((globalThis as any).window.composer).toBe(first);
    expect(second).toBe(first);
  });
});

describe("isRunning", () => {
  let composer: Composer;
  let verification: IVerification;

  beforeAll(() => {
    composer = new Composer("test-public-key", { isEnabled: false });
  });

  beforeEach(() => {
    verification = {
      id: "test-verification-id",
      status: VerificationStatus.PENDING,
      outcome: VerificationOutcome.PENDING,
      stepData: {},
      nextSteps: [],
    };
  });

  test("should return true for a pending verification", () => {
    verification.status = VerificationStatus.PENDING;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isRunning(verification)).toBe(true);
  });

  test("should return true for a blocked verification", () => {
    verification.status = VerificationStatus.BLOCKED;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isRunning(verification)).toBe(true);
  });

  test("should return false for an approved verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.APPROVED;

    expect(composer.isRunning(verification)).toBe(false);
  });

  test("should return false for a denied verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.DENIED;

    expect(composer.isRunning(verification)).toBe(false);
  });

  test("should return false for a failed verification", () => {
    verification.status = VerificationStatus.FAILED;
    verification.outcome = VerificationOutcome.ERROR;

    expect(composer.isRunning(verification)).toBe(false);
  });

  test("should return false for an undecided complete verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isRunning(verification)).toBe(false);
  });
});

describe("isAllowed", () => {
  let composer: Composer;
  let verification: IVerification;

  beforeAll(() => {
    composer = new Composer("test-public-key", { isEnabled: false });
  });

  beforeEach(() => {
    verification = {
      id: "test-verification-id",
      status: VerificationStatus.PENDING,
      outcome: VerificationOutcome.PENDING,
      stepData: {},
      nextSteps: [],
    };
  });

  test("should return false for a pending verification", () => {
    verification.status = VerificationStatus.PENDING;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isAllowed(verification)).toBe(false);
  });

  test("should return false for a blocked verification", () => {
    verification.status = VerificationStatus.BLOCKED;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isAllowed(verification)).toBe(false);
  });

  test("should return true for an approved verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.APPROVED;

    expect(composer.isAllowed(verification)).toBe(true);
  });

  test("should return false for a denied verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.DENIED;

    expect(composer.isAllowed(verification)).toBe(false);
  });

  test("should return false for a failed verification", () => {
    verification.status = VerificationStatus.FAILED;
    verification.outcome = VerificationOutcome.ERROR;

    expect(composer.isAllowed(verification)).toBe(false);
  });

  test("should return false for an undecided complete verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isAllowed(verification)).toBe(false);
  });
});

describe("isDenied", () => {
  let composer: Composer;
  let verification: IVerification;

  beforeAll(() => {
    composer = new Composer("test-public-key", { isEnabled: false });
  });

  beforeEach(() => {
    verification = {
      id: "test-verification-id",
      status: VerificationStatus.PENDING,
      outcome: VerificationOutcome.PENDING,
      stepData: {},
      nextSteps: [],
    };
  });

  test("should return false for a pending verification", () => {
    verification.status = VerificationStatus.PENDING;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isDenied(verification)).toBe(false);
  });

  test("should return false for a blocked verification", () => {
    verification.status = VerificationStatus.BLOCKED;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isDenied(verification)).toBe(false);
  });

  test("should return false for an approved verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.APPROVED;

    expect(composer.isDenied(verification)).toBe(false);
  });

  test("should return true for a denied verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.DENIED;

    expect(composer.isDenied(verification)).toBe(true);
  });

  test("should return false for a failed verification", () => {
    verification.status = VerificationStatus.FAILED;
    verification.outcome = VerificationOutcome.ERROR;

    expect(composer.isDenied(verification)).toBe(false);
  });

  test("should return false for an undecided complete verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isDenied(verification)).toBe(false);
  });
});

describe("isUndecided", () => {
  let composer: Composer;
  let verification: IVerification;

  beforeAll(() => {
    composer = new Composer("test-public-key", { isEnabled: false });
  });

  beforeEach(() => {
    verification = {
      id: "test-verification-id",
      status: VerificationStatus.PENDING,
      outcome: VerificationOutcome.PENDING,
      stepData: {},
      nextSteps: [],
    };
  });

  test("should return false for a pending verification", () => {
    verification.status = VerificationStatus.PENDING;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isUndecided(verification)).toBe(false);
  });

  test("should return false for a blocked verification", () => {
    verification.status = VerificationStatus.BLOCKED;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isUndecided(verification)).toBe(false);
  });

  test("should return false for an approved verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.APPROVED;

    expect(composer.isUndecided(verification)).toBe(false);
  });

  test("should return false for a denied verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.DENIED;

    expect(composer.isUndecided(verification)).toBe(false);
  });

  test("should return false for a failed verification", () => {
    verification.status = VerificationStatus.FAILED;
    verification.outcome = VerificationOutcome.ERROR;

    expect(composer.isUndecided(verification)).toBe(false);
  });

  test("should return true for an undecided complete verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.isUndecided(verification)).toBe(true);
  });
});

describe("hasError", () => {
  let composer: Composer;
  let verification: IVerification;

  beforeAll(() => {
    composer = new Composer("test-public-key", { isEnabled: false });
  });

  beforeEach(() => {
    verification = {
      id: "test-verification-id",
      status: VerificationStatus.PENDING,
      outcome: VerificationOutcome.PENDING,
      stepData: {},
      nextSteps: [],
    };
  });

  test("should return false for a pending verification", () => {
    verification.status = VerificationStatus.PENDING;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.hasError(verification)).toBe(false);
  });

  test("should return false for a blocked verification", () => {
    verification.status = VerificationStatus.BLOCKED;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.hasError(verification)).toBe(false);
  });

  test("should return false for an approved verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.APPROVED;

    expect(composer.hasError(verification)).toBe(false);
  });

  test("should return false for a denied verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.DENIED;

    expect(composer.hasError(verification)).toBe(false);
  });

  test("should return true for a failed verification", () => {
    verification.status = VerificationStatus.FAILED;
    verification.outcome = VerificationOutcome.ERROR;

    expect(composer.hasError(verification)).toBe(true);
  });

  test("should return false for an undecided complete verification", () => {
    verification.status = VerificationStatus.COMPLETE;
    verification.outcome = VerificationOutcome.PENDING;

    expect(composer.hasError(verification)).toBe(false);
  });
});

describe("handleVerification", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should use crypto.getRandomValues for backoff jitter within inclusive bounds", async () => {
    jest.spyOn(utilities, "getInitializationConfig").mockResolvedValue(null as any);
    const composer = new Composer("test-public-key", {
      apiVersion: ComposerApiVersion.v1,
      logLevel: LogLevel.NONE,
    });

    const pending: IVerification = {
      id: "test-verification-id",
      status: VerificationStatus.PENDING,
      outcome: VerificationOutcome.PENDING,
      stepData: {},
      nextSteps: [],
    };
    const cancelled = {
      ...pending,
      status: VerificationStatus.COMPLETE,
      outcome: VerificationOutcome.ERROR,
    };

    // 2^32 - 1 is in the rejected zone for a range of 201, so the next value is drawn.
    // 4294967195 % 201 === 200 (the max), and 0 is the min.
    const randomValues = [2 ** 32 - 1, 4294967195, 0, 0];
    const getRandomValues = jest
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((array: any) => {
        array[0] = randomValues.shift();
        return array;
      });

    let finishPolling: () => void;
    const pollingFinished = new Promise<void>((resolve) => {
      finishPolling = resolve;
    });
    let numQueries = 0;
    jest.spyOn(utilities, "queryVerification").mockImplementation(async () => {
      numQueries += 1;
      if (numQueries === 6) {
        finishPolling();
        return { verification: cancelled } as any;
      }
      return { verification: pending } as any;
    });

    const setTimeoutSpy = jest.spyOn(global, "setTimeout");
    composer.handleVerification(pending, {
      onVerified: jest.fn(),
      onApproved: jest.fn(),
    });
    await pollingFinished;

    // The first 4 waits use the initial interval, then temp / 2 + jitter:
    // wait 5 is 200 + max(0..200), wait 6 is 400 + min(0..400)
    expect(setTimeoutSpy.mock.calls.map((call) => call[1])).toEqual([
      200, 200, 200, 200, 400, 400,
    ]);
    expect(getRandomValues).toHaveBeenCalledTimes(4);
    for (const [array] of getRandomValues.mock.calls) {
      expect(array).toBeInstanceOf(Uint32Array);
      expect((array as Uint32Array).length).toBe(1);
    }
  });
});
