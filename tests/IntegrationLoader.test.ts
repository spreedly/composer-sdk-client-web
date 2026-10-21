/**
 * @jest-environment jsdom
 */
import IntegrationLoader from "../src/IntegrationLoader";
import { REQUIREJS_SOURCE, REQUIREJS_VERSION } from "../src/requirejs";
import { ILibConfig } from "../src/types";

describe("vendored RequireJS", () => {
  it("matches the installed requirejs package (rerun npm run vendor:requirejs after upgrading)", () => {
    const { version } = require("requirejs/package.json");
    expect(REQUIREJS_VERSION).toBe(version);
    expect(REQUIREJS_SOURCE).toContain(`version="${version}"`);
  });
});

describe("IntegrationLoader", () => {
  const parentContext = {
    publicKey: "test-public-key",
    config: {} as any,
    clearScreen: () => {},
  };

  const waitForRequire = async (loader: IntegrationLoader) => {
    for (let i = 0; i < 200 && !loader.isRequireLoaded; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(loader.isRequireLoaded).toBe(true);
  };

  afterEach(() => {
    // The injected script declares composerRequire with var, so it can't be deleted
    (window as any).composerRequire = undefined;
    delete (window as any)._composer_integrations;
    delete (global as any).fetch;
    jest.restoreAllMocks();
  });

  it("loads the bundled RequireJS without fetching it", async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;

    const loader = new IntegrationLoader({ parentContext });
    await waitForRequire(loader);

    expect(fetchMock).not.toHaveBeenCalled();
    const { requirejs, define, require } = (window as any).composerRequire;
    expect(requirejs.version).toBe(REQUIREJS_VERSION);

    define("answer", [], () => 42);
    await expect(
      new Promise((resolve) => require(["answer"], resolve))
    ).resolves.toBe(42);
  });

  it("resolves an empty integration list", async () => {
    const loader = new IntegrationLoader({ parentContext });

    await expect(loader.loadIntegrations([], "request-id")).resolves.toEqual([]);
  });

  it("skips an integration whose script doesn't register a class and loads the rest", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    (window as any)._composer_integrations = {
      REGISTERED: class {
        name: string;
        purposes = [];
        constructor(config: any) {
          this.name = config.name;
        }
        hasLoaded() {
          return true;
        }
        async configure() {}
      },
    };
    const lib = (name: string): ILibConfig => ({
      name,
      url: "",
      config: {},
      content: {
        text: `define("integrations/${name}", [], function () { return {}; });`,
      },
    });

    const loader = new IntegrationLoader({ parentContext });
    const integrations = await loader.loadIntegrations(
      [lib("REGISTERED"), lib("MISSING")],
      "request-id"
    );

    expect(integrations.map((integration) => integration.name)).toEqual([
      "REGISTERED",
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No integration class found for: MISSING"),
      undefined
    );
  });

  it("skips an integration whose configure() throws and loads the rest", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    const integrationClass = (configureError?: Error) =>
      class {
        name: string;
        purposes = [];
        constructor(config: any) {
          this.name = config.name;
        }
        hasLoaded() {
          return true;
        }
        async configure() {
          if (configureError) throw configureError;
        }
      };
    (window as any)._composer_integrations = {
      WORKS: integrationClass(),
      THROWS: integrationClass(new Error("configure failed")),
    };
    const lib = (name: string): ILibConfig => ({
      name,
      url: "",
      config: {},
      content: {
        text: `define("integrations/${name}", [], function () { return {}; });`,
      },
    });

    const loader = new IntegrationLoader({ parentContext });
    const integrations = await loader.loadIntegrations(
      [lib("WORKS"), lib("THROWS")],
      "request-id"
    );

    expect(integrations.map((integration) => integration.name)).toEqual([
      "WORKS",
    ]);
  });

  it("skips integrations when RequireJS never loads", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    // Stand-in for a Content-Security-Policy blocking the inline RequireJS script
    jest
      .spyOn(document.body, "appendChild")
      .mockImplementationOnce((node) => node);

    const loader = new IntegrationLoader({ parentContext });
    const integrations = await loader.loadIntegrations(
      [
        {
          name: "BLOCKED",
          url: "",
          config: {},
          content: { text: "" },
        },
      ],
      "request-id"
    );

    expect(integrations).toEqual([]);
    expect(loader.isRequireFailed).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("RequireJS didn't load"),
      undefined
    );
  });

  it("skips integrations when Trusted Types rejects the RequireJS script", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const trustedTypesError = new TypeError(
      "Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment."
    );
    jest
      .spyOn(Element.prototype, "innerHTML", "set")
      .mockImplementationOnce(() => {
        throw trustedTypesError;
      });

    const loader = new IntegrationLoader({ parentContext });
    const integrations = await loader.loadIntegrations(
      [
        {
          name: "BLOCKED",
          url: "",
          config: {},
          content: { text: "" },
        },
      ],
      "request-id"
    );

    expect(integrations).toEqual([]);
    expect(loader.isRequireFailed).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("RequireJS didn't load"),
      trustedTypesError
    );
  });
});
