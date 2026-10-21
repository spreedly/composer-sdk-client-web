/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://app.example.com/"}
 */
import Cookies from "js-cookie";
import { Composer } from "../src/Composer";
import { COMPOSER_SESSION_KEY, ComposerSessionMessageType } from "../src/constants";
import { ComposerApiVersion } from "../src/types";

describe("_db_s session cookie", () => {
  let composer: any;

  beforeEach(() => {
    composer = new Composer("test-public-key", {
      apiVersion: ComposerApiVersion.v1,
      isEnabled: false,
    });
    composer.useSessionFallback = true;
    composer.sessionHelperIsLoaded = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Cookies.remove(COMPOSER_SESSION_KEY, { domain: "example.com" });
  });

  const setSession = (value: string) =>
    composer.sendSessionUtilMessage({
      type: ComposerSessionMessageType.SET_SESSION,
      key: COMPOSER_SESSION_KEY,
      value,
    });

  it("sets _db_s on the parent domain as secure and sameSite=lax", () => {
    const setSpy = jest.spyOn(Cookies, "set");

    setSession("session-value");

    expect(setSpy).toHaveBeenCalledWith(COMPOSER_SESSION_KEY, "session-value", {
      domain: "example.com",
      sameSite: "lax",
      secure: true,
      expires: 365,
    });
    expect(Cookies.get(COMPOSER_SESSION_KEY)).toBe("session-value");
  });

  it("clears _db_s", () => {
    setSession("session-value");

    composer.sendSessionUtilMessage({
      type: ComposerSessionMessageType.CLEAR_SESSION,
      key: COMPOSER_SESSION_KEY,
    });

    expect(Cookies.get(COMPOSER_SESSION_KEY)).toBeUndefined();
  });

  it("clears an expired _db_s when reading the session", () => {
    setSession(JSON.stringify({ sessionId: "old", expiry: 0 }));

    composer.sendSessionUtilMessage({
      type: ComposerSessionMessageType.GET_SESSION,
      key: COMPOSER_SESSION_KEY,
    });

    expect(Cookies.get(COMPOSER_SESSION_KEY)).toBeUndefined();
  });

  it("clears an unreadable _db_s when reading the session", () => {
    setSession("not-json");

    composer.sendSessionUtilMessage({
      type: ComposerSessionMessageType.GET_SESSION,
      key: COMPOSER_SESSION_KEY,
    });

    expect(Cookies.get(COMPOSER_SESSION_KEY)).toBeUndefined();
  });
});
