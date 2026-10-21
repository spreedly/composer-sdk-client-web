import {
  IComposerParentContext,
  ILibConfig,
  IntegrationPurpose,
} from "./types";

import Integration from "./Integration";
import { MAX_INTEGRATION_LOAD_TIMEOUT } from "./constants";
import { Logger } from "./logger";
import { REQUIREJS_SOURCE } from "./requirejs";

export interface IIntegrationLoaderProps {
  parentContext: IComposerParentContext;
}

export default class IntegrationLoader {
  parentContext: IComposerParentContext;
  isRequireLoaded: boolean = false;
  isRequireFailed: boolean = false;
  onRequireLoaded: any[] = [];
  loadedIntegrations: { [key: string]: Integration } = {};

  constructor({ parentContext }: IIntegrationLoaderProps) {
    this.parentContext = parentContext;

    const requireScript = document.createElement("script");
    const customRequire = `
      var composerRequire = (function () {
        var require = {};
        ${REQUIREJS_SOURCE}
        return {require, define, requirejs};
      }());
    `;
    const skipIntegrations = async (error?: unknown) => {
      Logger.error(
        "RequireJS didn't load, so integrations were skipped. Check the page's Content-Security-Policy allows the SDK's inline scripts.",
        error
      ).log();
      this.isRequireFailed = true;
      for (const callback of this.onRequireLoaded) {
        await callback();
      }
    };

    try {
      requireScript.innerHTML = customRequire;
    } catch (error) {
      // Trusted Types enforcement rejects a plain string here
      skipIntegrations(error);
      return;
    }

    let tries = 0;
    const maxTries = 1000;

    const registerCheck = () => {
      setTimeout(async () => {
        tries += 1;
        if ((window as any).composerRequire) {
          this.isRequireLoaded = true;
          for (const callback of this.onRequireLoaded) {
            await callback();
          }
        } else if (tries < maxTries) {
          registerCheck();
        } else {
          // The inline RequireJS script never ran, e.g. a Content-Security-Policy blocked it
          skipIntegrations();
        }
      }, 1);
    };

    registerCheck();
    document.body.appendChild(requireScript);
  }

  public async loadIntegrations(
    libs: ILibConfig[],
    requestId: string
  ): Promise<Integration[]> {
    if (libs.length === 0) {
      return [];
    }

    return new Promise((resolve) => {
      let integrationsMap: { [key: string]: Integration } = {};
      let resolvedCount = 0;

      const onIntegrationLoaded = (integration: Integration | null) => {
        resolvedCount += 1;
        if (integration !== null) {
          integrationsMap[integration.name] = integration;
        }

        if (libs.length === resolvedCount) {
          // All of the integrations have been loaded or skipped
          resolve(Object.values(integrationsMap));
        }
      };

      libs.forEach((libConfig) => {
        this.loadIntegration(libConfig, requestId).then(onIntegrationLoaded);
      });
    });
  }

  public async loadIntegration(
    libConfig: ILibConfig,
    requestId: string
  ): Promise<Integration | null> {
    let integration: Integration;

    // Check if the integration has already been loaded.
    // If so, return the existing integration.
    if (this.loadedIntegrations.hasOwnProperty(libConfig.name)) {
      try {
        Logger.info(`Integration already loaded: ${libConfig.name}`).log();
        integration = this.loadedIntegrations[libConfig.name];
        Logger.info(`Reconfiguring integration: ${libConfig.name}`).log();
        await integration.reconfigure({ ...libConfig, requestId });
        return integration;
      } catch (error) {
        Logger.error(
          `Error loading integration: ${libConfig.name}`,
          error
        ).log();
        return null;
      }
    } else {
      const _loadIntegration = (resolve: any, reject: any) => {
        try {
          // Dynamically load the integration content
          if (libConfig.content != null) {
            const integrationTimeoutValue = libConfig.loadTimeout
              ? libConfig.loadTimeout
              : this.parentContext?.config?.integrationTimeout
              ? this.parentContext.config.integrationTimeout
              : MAX_INTEGRATION_LOAD_TIMEOUT;
            const timeoutHandle = setTimeout(() => {
              Logger.error(
                `Timeout loading integration. ${libConfig.name} took longer than ${integrationTimeoutValue}ms to load. Skipping.`
              ).log();
              resolve(null);
            }, integrationTimeoutValue);

            const integrationScript = document.createElement("script");

            const onIntegrationContentReady = async () => {
              (window as any).composerRequire.require(
                [`integrations/${libConfig.name}`],
                () => {
                  let integrationClass: Integration;

                  // Integration scripts still register under _dodgeball_integrations
                  integrationClass =
                    (window as any)._composer_integrations?.[libConfig.name] ??
                    (window as any)._dodgeball_integrations?.[libConfig.name];

                  if (integrationClass != null) {
                    Logger.info(
                      `Integration class found for: ${libConfig.name}`
                    ).log();

                    integration = new (integrationClass as any)({
                      ...libConfig,
                      requestId,
                      parentContext: this.parentContext,
                    });

                    (async () => {
                      try {
                        if (!integration.hasLoaded()) {
                          Logger.info(
                            `Loading integration dependencies: ${libConfig.name}`
                          ).log();
                          await integration.load();
                        }

                        // At this point, we know all the integration dependencies have been loaded
                        clearTimeout(timeoutHandle);

                        Logger.info(
                          `Configuring integration: ${libConfig.name}`
                        ).log();
                        await integration.configure();
                        this.loadedIntegrations[libConfig.name] = integration;
                        resolve(integration);
                      } catch (error) {
                        Logger.error(
                          `Error loading integration: ${libConfig.name}`,
                          error
                        ).log();
                        clearTimeout(timeoutHandle);
                        resolve(null);
                      }
                    })();
                  } else {
                    Logger.error(
                      `No integration class found for: ${libConfig.name}`
                    ).log();
                    clearTimeout(timeoutHandle);
                    resolve(null);
                  }
                }
              );
            };

            if (libConfig.content.url) {
              integrationScript.src = libConfig.content.url;
              integrationScript.onload = onIntegrationContentReady;
            } else {
              integrationScript.innerHTML = `(function ({require, define, requirejs}) {${
                libConfig.content.text as string
              }}(composerRequire));`;
              setTimeout(onIntegrationContentReady, 2);
            }
            document.body.appendChild(integrationScript);
          } else {
            Logger.error(`No integration content: ${libConfig.name}`).log();
            resolve(null);
          }
        } catch (error) {
          Logger.error(
            `Error loading integration: ${libConfig.name}`,
            error
          ).log();
          resolve(null);
        }
      };

      return new Promise((resolve, reject) => {
        const start = () =>
          this.isRequireFailed ? resolve(null) : _loadIntegration(resolve, reject);

        if (this.isRequireLoaded || this.isRequireFailed) {
          start();
        } else {
          this.onRequireLoaded.push(start);
        }
      });
    }
  }

  public filterIntegrationsByPurpose(
    integrations: Integration[],
    purpose: IntegrationPurpose
  ): Integration[] {
    return integrations.filter(
      (integration) => integration.purposes.indexOf(purpose) > -1
    );
  }
}
