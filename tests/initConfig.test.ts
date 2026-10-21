/**
 * @jest-environment jsdom
 */
import { Composer } from "../src/Composer";
import IntegrationLoader from "../src/IntegrationLoader";
import { ComposerApiVersion } from "../src/types";

describe("init config from a script[data-composer] tag", () => {
  let loadIntegrationsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest
      .spyOn(Composer.prototype as any, "generateSourceToken")
      .mockResolvedValue(undefined);
    loadIntegrationsSpy = jest.spyOn(
      IntegrationLoader.prototype,
      "loadIntegrations"
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as any)._composer_init_conf;
    document.head.innerHTML = "";
  });

  const startWithScriptTag = async (scriptEvent = "load") => {
    const script = document.createElement("script");
    script.setAttribute("data-composer", "");
    document.head.appendChild(script);

    const composer: any = new Composer("test-public-key", {
      apiVersion: ComposerApiVersion.v1,
    });

    // The constructor attaches the load listener in a setTimeout
    await new Promise((resolve) => setTimeout(resolve, 0));
    script.dispatchEvent(new Event(scriptEvent));

    for (let i = 0; i < 200 && !composer.areIntegrationsLoaded; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return composer;
  };

  it("uses window._composer_init_conf when it's set", async () => {
    (window as any)._composer_init_conf = { requestId: "from-config", libs: [] };

    const composer = await startWithScriptTag();

    expect(composer.areIntegrationsLoaded).toBe(true);
    expect(loadIntegrationsSpy).toHaveBeenCalledWith([], "from-config");
  });

  it("uses window._composer_init_conf when the script loaded before the SDK started", async () => {
    (window as any)._composer_init_conf = { requestId: "already-loaded", libs: [] };
    const script = document.createElement("script");
    script.setAttribute("data-composer", "");
    document.head.appendChild(script);

    // No load event is dispatched: it fired before the SDK attached its listener
    const composer: any = new Composer("test-public-key", {
      apiVersion: ComposerApiVersion.v1,
    });
    for (let i = 0; i < 200 && !composer.areIntegrationsLoaded; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    expect(composer.areIntegrationsLoaded).toBe(true);
    expect(loadIntegrationsSpy).toHaveBeenCalledWith([], "already-loaded");
  });

  it("finishes init with no integrations when the script fails to load", async () => {
    const composer = await startWithScriptTag("error");

    expect(composer.areIntegrationsLoaded).toBe(true);
    expect(loadIntegrationsSpy).toHaveBeenCalledWith([], expect.any(String));
  });

  it("finishes init with no integrations when window._composer_init_conf isn't set", async () => {
    const composer = await startWithScriptTag();

    expect(composer.areIntegrationsLoaded).toBe(true);
    expect(loadIntegrationsSpy).toHaveBeenCalledWith([], expect.any(String));
  });
});
