// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

// Mock server-only so it doesn't throw in test environment
vi.mock("server-only", () => ({}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

// Cookie store mock
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

async function signToken(
  payload: object,
  expiresIn: string = "7d"
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

function makeRequest(token?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/test");
  if (token) {
    req.cookies.set("auth-token", token);
  }
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("signs a JWT and sets an httpOnly cookie", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();

    const [name, , options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("cookie expiry is approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 100);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 100);
  });

  test("token payload contains userId and email", async () => {
    await createSession("user-42", "hello@test.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@test.com");
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const payload = {
      userId: "user-1",
      email: "user@example.com",
      expiresAt: new Date().toISOString(),
    };
    const token = await signToken(payload);
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("user@example.com");
  });

  test("returns null for an expired token", async () => {
    const payload = { userId: "user-1", email: "user@example.com" };
    const token = await signToken(payload, "0s");
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when no cookie is present on the request", async () => {
    const req = makeRequest();
    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token on the request", async () => {
    const payload = {
      userId: "user-2",
      email: "other@example.com",
      expiresAt: new Date().toISOString(),
    };
    const token = await signToken(payload);
    const req = makeRequest(token);

    const session = await verifySession(req);

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-2");
    expect(session?.email).toBe("other@example.com");
  });

  test("returns null for an expired token on the request", async () => {
    const token = await signToken({ userId: "u", email: "e@e.com" }, "0s");
    const req = makeRequest(token);

    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns null for a malformed token on the request", async () => {
    const req = makeRequest("garbage");
    const session = await verifySession(req);
    expect(session).toBeNull();
  });
});
