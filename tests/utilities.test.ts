import http from "http";
import type { AddressInfo } from "net";
import { getMd5, makeRequest } from "../src/utilities";

describe("makeRequest", () => {
  let server: http.Server;
  let baseUrl: string;
  let errorOnceHits: number;
  let alwaysErrorHits: number;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        if (req.url === "/ok") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, echo: body }));
        } else if (req.url === "/error-once") {
          errorOnceHits++;
          if (errorOnceHits === 1) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false }));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, attempt: errorOnceHits }));
          }
        } else if (req.url === "/always-error") {
          alwaysErrorHits++;
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ success: false, errors: [{ code: 500, message: "boom" }] })
          );
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    });

    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    errorOnceHits = 0;
    alwaysErrorHits = 0;
  });

  test("returns the parsed JSON body on a successful GET", async () => {
    const response = await makeRequest({
      url: `${baseUrl}/ok`,
      method: "GET",
      headers: { "Dodgeball-Public-Key": "test" },
      data: null,
    });

    expect(response).toEqual({ success: true, echo: "" });
  });

  test("serializes and sends a JSON body on POST", async () => {
    const response = await makeRequest({
      url: `${baseUrl}/ok`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: { fingerprints: ["a", "b"] },
    });

    expect(response.success).toBe(true);
    expect(response.echo).toContain("fingerprints");
  });

  test("retries after a failed attempt and returns the eventual success body", async () => {
    const response = await makeRequest({
      url: `${baseUrl}/error-once`,
      method: "GET",
      headers: {},
      data: null,
    });

    expect(errorOnceHits).toBe(2);
    expect(response).toEqual({ success: true, attempt: 2 });
  });

  test(
    "exhausts all retries and returns the last error when every attempt fails",
    async () => {
      const response = await makeRequest({
        url: `${baseUrl}/always-error`,
        method: "GET",
        headers: {},
        data: null,
      });

      // MAX_REQUEST_RETRIES in src/utilities.ts
      expect(alwaysErrorHits).toBe(4);
      // NOTE: on exhaustion makeRequest returns the raw AxiosError instead
      // of throwing, so callers reading `.token`/`.expiry` off the result
      // silently get `undefined` rather than a catchable error. Pre-existing
      // behavior (predates the axios 0.24->1.x bump) - not fixed here,
      // tracked as a follow-up.
      expect(response.isAxiosError).toBe(true);
    },
    10000
  );
});

// The source token cookie name is an MD5 of the public key and API URL, so these must never change
describe("getMd5", () => {
  it.each([
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["1234567890".repeat(8), "57edf4a22be3c955ac49da2e2107b67a"],
    ["héllo 日本 😀", "0a090a16a10d1417d37bd7fd21e081c0"],
  ])("hashes %j", (input, expected) => {
    expect(getMd5(input)).toBe(expected);
  });

  it("hashes the parts of an array as one string, treating null as empty", () => {
    expect(getMd5(["public-key-123", "https://api.dodgeballhq.com/"])).toBe(
      "98ade5fe35a752fc016a2358ddbde3df"
    );
    expect(getMd5(["abc", null as unknown as string])).toBe(getMd5("abc"));
  });
});
