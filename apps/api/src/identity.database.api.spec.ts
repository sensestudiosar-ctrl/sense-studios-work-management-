import "reflect-metadata";
import { createHash, createHmac, generateKeyPairSync, randomBytes, randomUUID, sign, type KeyObject } from "node:crypto";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import request from "supertest";
import { AccountKind, AccountState } from "./generated/prisma/client.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { DatabaseService } from "./database.service.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";

const databaseUrl = process.env.DATABASE_URL;
const databaseApiDescribe = databaseUrl ? describe : describe.skip;
const webOrigin = "http://localhost:5173";
const bootstrapEmail = "s02-owner-bootstrap@example.test";
const bootstrapSecret = randomBytes(32).toString("base64url");
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const newSecret = () => randomBytes(32).toString("base64url");

type VirtualCredential = { id: string; privateKey: KeyObject; counter: number };

function clientData(type: "webauthn.create" | "webauthn.get", challenge: string): Buffer {
  return Buffer.from(JSON.stringify({ type, challenge, origin: webOrigin, crossOrigin: false }));
}

function authenticatorData(flags: number, counter: number): Buffer {
  const count = Buffer.alloc(4);
  count.writeUInt32BE(counter);
  return Buffer.concat([createHash("sha256").update("localhost").digest(), Buffer.from([flags]), count]);
}

function virtualRegistration(challenge: string): { credential: VirtualCredential; response: RegistrationResponseJSON } {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  const credentialId = randomBytes(32);
  const credentialKey = isoCBOR.encode(new Map([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, new Uint8Array(Buffer.from(jwk.x!, "base64url"))],
    [-3, new Uint8Array(Buffer.from(jwk.y!, "base64url"))]
  ]));
  const credentialIdLength = Buffer.alloc(2);
  credentialIdLength.writeUInt16BE(credentialId.length);
  const registrationData = Buffer.concat([
    authenticatorData(0x45, 0),
    Buffer.alloc(16),
    credentialIdLength,
    credentialId,
    Buffer.from(credentialKey)
  ]);
  const attestationObject = isoCBOR.encode(new Map([
    ["fmt", "none"],
    ["attStmt", new Map()],
    ["authData", new Uint8Array(registrationData)]
  ]));
  const id = credentialId.toString("base64url");
  return {
    credential: { id, privateKey, counter: 0 },
    response: {
      id,
      rawId: id,
      type: "public-key",
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      response: {
        clientDataJSON: clientData("webauthn.create", challenge).toString("base64url"),
        attestationObject: Buffer.from(attestationObject).toString("base64url"),
        transports: ["internal"]
      }
    } as RegistrationResponseJSON
  };
}

function virtualAssertion(credential: VirtualCredential, challenge: string): AuthenticationResponseJSON {
  const counter = credential.counter + 1;
  const authData = authenticatorData(0x05, counter);
  const encodedClientData = clientData("webauthn.get", challenge);
  const signedData = Buffer.concat([authData, createHash("sha256").update(encodedClientData).digest()]);
  return {
    id: credential.id,
    rawId: credential.id,
    type: "public-key",
    authenticatorAttachment: "platform",
    clientExtensionResults: {},
    response: {
      authenticatorData: authData.toString("base64url"),
      clientDataJSON: encodedClientData.toString("base64url"),
      signature: sign("sha256", signedData, credential.privateKey).toString("base64url"),
      userHandle: null
    }
  };
}

databaseApiDescribe("identity HTTP contract with PostgreSQL", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let config: RuntimeConfig;
  const accountIds = new Set<string>();
  const challengeIds = new Set<string>();

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL is required for the identity database API suite");
    config = {
      nodeEnv: "test",
      port: 4000,
      databaseUrl,
      webOrigin,
      ownerBootstrapEmail: bootstrapEmail,
      ownerBootstrapSecret: bootstrapSecret
    };
    const module = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [
        DatabaseService,
        IdentityService,
        { provide: RUNTIME_CONFIG, useValue: config }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    database = module.get(DatabaseService);
    const staleOwnerFixtures = await database.prisma.account.findMany({
      where: { kind: AccountKind.OWNER, normalizedEmail: { startsWith: "s02-owner-" } },
      select: { id: true }
    });
    for (const account of staleOwnerFixtures) await removeAccountFixture(account.id);
  });

  afterEach(async () => {
    if (!database) return;
    const bootstrappedOwner = await database.prisma.account.findUnique({ where: { normalizedEmail: bootstrapEmail } });
    if (bootstrappedOwner) accountIds.add(bootstrappedOwner.id);
    if (challengeIds.size > 0) {
      await database.prisma.webAuthnChallenge.deleteMany({ where: { id: { in: [...challengeIds] } } });
      challengeIds.clear();
    }
    for (const id of accountIds) {
      await removeAccountFixture(id);
    }
    accountIds.clear();
  });

  async function removeAccountFixture(id: string) {
    await database.prisma.webAuthnChallenge.deleteMany({ where: { accountId: id } });
    await database.prisma.securityEvent.deleteMany({ where: { OR: [{ actorId: id }, { subjectId: id }] } });
    await database.prisma.identityEnrollmentGrant.deleteMany({ where: { OR: [{ accountId: id }, { authorizedByAccountId: id }] } });
    await database.prisma.staffRecoveryAuthorization.deleteMany({ where: { OR: [{ accountId: id }, { authorizedByAccountId: id }] } });
    await database.prisma.ownerRecoveryCode.deleteMany({ where: { accountId: id } });
    await database.prisma.passkeyCredential.deleteMany({ where: { accountId: id } });
    await database.prisma.session.deleteMany({ where: { accountId: id } });
    await database.prisma.account.delete({ where: { id } });
  }

  afterAll(async () => {
    await app?.close();
  });

  async function fixture(options: { kind?: AccountKind; state?: AccountState; expiresAt?: Date; revokedAt?: Date | null } = {}) {
    const account = await database.prisma.account.create({
      data: {
        normalizedEmail: `s02-${randomUUID()}@example.test`,
        kind: options.kind ?? AccountKind.STAFF,
        state: options.state ?? AccountState.ACTIVE
      }
    });
    accountIds.add(account.id);
    const secret = newSecret();
    const csrfToken = createHmac("sha256", secret).update("csrf").digest("base64url");
    const session = await database.prisma.session.create({
      data: {
        accountId: account.id,
        tokenHash: digest(secret),
        csrfTokenHash: digest(csrfToken),
        expiresAt: options.expiresAt ?? new Date(Date.now() + 60 * 60_000),
        revokedAt: options.revokedAt ?? null,
        userAgent: "S02 API test",
        ipAddress: "127.0.0.1"
      }
    });
    return { account, session, secret, csrfToken };
  }

  it("denies missing, unknown, revoked, expired, and suspended sessions against the real database", async () => {
    const revoked = await fixture({ revokedAt: new Date() });
    const expired = await fixture({ expiresAt: new Date(Date.now() - 1_000) });
    const suspended = await fixture({ state: AccountState.SUSPENDED });

    const missing = await request(app.getHttpServer()).get("/api/v1/auth/session");
    const unknown = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", "sense_sid=unknown-session-secret");
    const revokedResponse = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", `sense_sid=${revoked.secret}`);
    const expiredResponse = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", `sense_sid=${expired.secret}`);
    const suspendedResponse = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", `sense_sid=${suspended.secret}`);

    for (const response of [missing, unknown, revokedResponse, expiredResponse, suspendedResponse]) {
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Authentication required");
    }
    expect(revokedResponse.headers["set-cookie"]?.join(";")).toContain("sense_sid=");
    expect(expiredResponse.headers["set-cookie"]?.join(";")).toContain("sense_sid=");
  });

  it("requires CSRF and same-origin before logout, then persists revocation and rejects cookie reuse", async () => {
    const fixtureData = await fixture();
    const cookie = `sense_sid=${fixtureData.secret}`;

    const missingCsrf = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", webOrigin);
    const wrongCsrf = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", "forged-csrf-token");
    const wrongOrigin = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", "https://attacker.example")
      .set("x-csrf-token", fixtureData.csrfToken);
    expect(missingCsrf.status).toBe(403);
    expect(wrongCsrf.status).toBe(403);
    expect(wrongOrigin.status).toBe(403);

    const logout = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", fixtureData.csrfToken);
    expect(logout.status).toBe(204);
    expect(logout.headers["set-cookie"]?.join(";")).toContain("sense_sid=");
    const persisted = await database.prisma.session.findUniqueOrThrow({ where: { id: fixtureData.session.id } });
    expect(persisted.revokedAt).toBeInstanceOf(Date);
    const event = await database.prisma.securityEvent.findFirst({ where: { eventType: "SESSION_REVOKED", subjectId: fixtureData.account.id } });
    expect(event).toMatchObject({ result: "SUCCESS", actorId: fixtureData.account.id });

    const reused = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", cookie);
    expect(reused.status).toBe(401);
  });

  it("lists only the current account's sessions and omits stored hashes", async () => {
    const first = await fixture();
    const firstSessionId = first.session.id;
    const other = await fixture();

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/sessions")
      .set("Cookie", `sense_sid=${first.secret}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ id: firstSessionId, current: true, userAgent: "S02 API test" });
    expect(response.body.some((item: { id: string }) => item.id === other.session.id)).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain(digest(first.secret));
    expect(JSON.stringify(response.body)).not.toContain(digest(first.csrfToken));
    expect(JSON.stringify(response.body)).not.toContain(first.secret);
  });

  it("creates indistinguishable public login options for known and unknown account emails", async () => {
    const account = await fixture();
    const unknown = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/login/options")
      .set("Origin", webOrigin)
      .send({ email: "unregistered@example.test" });
    const known = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/login/options")
      .set("Origin", webOrigin)
      .send({ email: account.account.normalizedEmail.toUpperCase() });

    expect(unknown.status).toBe(201);
    expect(known.status).toBe(201);
    expect(Object.keys(unknown.body).sort()).toEqual(Object.keys(known.body).sort());
    expect(Object.keys(unknown.body.options).sort()).toEqual(Object.keys(known.body.options).sort());
    expect(unknown.body).not.toHaveProperty("accountId");
    expect(known.body).not.toHaveProperty("accountId");
    const unknownChallenge = await database.prisma.webAuthnChallenge.findUniqueOrThrow({ where: { id: unknown.body.ceremonyId } });
    const knownChallenge = await database.prisma.webAuthnChallenge.findUniqueOrThrow({ where: { id: known.body.ceremonyId } });
    challengeIds.add(unknownChallenge.id);
    challengeIds.add(knownChallenge.id);
    expect(unknownChallenge.accountId).toBeNull();
    expect(knownChallenge.accountId).toBe(account.account.id);
  });

  it("completes Owner bootstrap, two-passkey setup, a real passkey login, and one-use recovery", async () => {
    const bootstrap = await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap/options")
      .set("Origin", webOrigin)
      .send({ email: bootstrapEmail, secret: bootstrapSecret });
    expect(bootstrap.status).toBe(201);
    const owner = await database.prisma.account.findUniqueOrThrow({ where: { normalizedEmail: bootstrapEmail } });
    accountIds.add(owner.id);
    expect(bootstrap.body.options).toHaveProperty("challenge");
    expect(JSON.stringify(bootstrap.body)).not.toContain(bootstrapSecret);

    const firstCredential = virtualRegistration(bootstrap.body.options.challenge);
    const firstRegistration = await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap/verify")
      .set("Origin", webOrigin)
      .send({ ceremonyId: bootstrap.body.ceremonyId, response: firstCredential.response });
    expect(firstRegistration.status).toBe(201);
    expect(firstRegistration.body).toEqual({ authenticated: true });
    const bootstrapCookie = cookieFrom(firstRegistration);
    expect(bootstrapCookie).toContain("sense_sid=");
    const firstSessionSecret = cookieSecret(bootstrapCookie);
    expect(JSON.stringify(firstRegistration.body)).not.toContain(firstSessionSecret);
    const replayedRegistration = await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap/verify")
      .set("Origin", webOrigin)
      .send({ ceremonyId: bootstrap.body.ceremonyId, response: firstCredential.response });
    expect(replayedRegistration.status).toBe(401);
    expect(await database.prisma.passkeyCredential.count({ where: { accountId: owner.id } })).toBe(1);

    const initialSession = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", bootstrapCookie);
    expect(initialSession.status).toBe(200);
    expect(initialSession.body).toMatchObject({
      account: { id: owner.id, kind: "OWNER" },
      ownerSetupRequired: true,
      activePasskeyCount: 1
    });
    const csrfToken = initialSession.body.csrfToken as string;

    const secondOptions = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/register/options")
      .set("Cookie", bootstrapCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", csrfToken);
    expect(secondOptions.status).toBe(201);
    const secondCredential = virtualRegistration(secondOptions.body.options.challenge);
    const secondRegistration = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/register/verify")
      .set("Cookie", bootstrapCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ ceremonyId: secondOptions.body.ceremonyId, response: secondCredential.response });
    expect(secondRegistration.status).toBe(201);

    const twoPasskeys = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", bootstrapCookie);
    expect(twoPasskeys.body).toMatchObject({ ownerSetupRequired: true, activePasskeyCount: 2 });
    const recoveryCodeResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/owner/recovery-code")
      .set("Cookie", bootstrapCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", csrfToken);
    expect(recoveryCodeResponse.status).toBe(201);
    const recoveryCode = recoveryCodeResponse.body.recoveryCode as string;
    const storedCode = await database.prisma.ownerRecoveryCode.findUniqueOrThrow({ where: { codeHash: digest(recoveryCode) } });
    expect(storedCode.accountId).toBe(owner.id);
    expect(storedCode.acknowledgedAt).toBeNull();
    expect(JSON.stringify(storedCode)).not.toContain(recoveryCode);
    const unacknowledgedSession = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", bootstrapCookie);
    expect(unacknowledgedSession.body.ownerSetupRequired).toBe(true);

    const acknowledgement = await request(app.getHttpServer())
      .post("/api/v1/auth/owner/recovery-code/ack")
      .set("Cookie", bootstrapCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ confirmedStoredOffline: true });
    expect(acknowledgement.status).toBe(204);
    const acknowledgedSession = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", bootstrapCookie);
    expect(acknowledgedSession.body).toMatchObject({ ownerSetupRequired: false, activePasskeyCount: 2 });
    expect((await database.prisma.ownerRecoveryCode.findUniqueOrThrow({ where: { id: storedCode.id } })).acknowledgedAt).toBeInstanceOf(Date);

    const loginOptions = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/login/options")
      .set("Origin", webOrigin)
      .send({ email: bootstrapEmail });
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/login/verify")
      .set("Origin", webOrigin)
      .send({ ceremonyId: loginOptions.body.ceremonyId, response: virtualAssertion(firstCredential.credential, loginOptions.body.options.challenge) });
    expect(loginOptions.status).toBe(201);
    expect(login.status).toBe(201);
    expect(login.body).toEqual({ authenticated: true });
    const loginCookie = cookieFrom(login);
    expect(JSON.stringify(login.body)).not.toContain(cookieSecret(loginCookie));
    const firstCredentialRecord = await database.prisma.passkeyCredential.findUniqueOrThrow({ where: { credentialId: firstCredential.credential.id } });
    expect(firstCredentialRecord.counter).toBe(1n);
    expect(firstCredentialRecord.lastUsedAt).toBeInstanceOf(Date);
    const loggedIn = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", loginCookie);
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.account.id).toBe(owner.id);

    const recoveryOptions = await request(app.getHttpServer())
      .post("/api/v1/auth/owner/recovery/options")
      .set("Origin", webOrigin)
      .send({ email: bootstrapEmail, code: recoveryCode });
    expect(recoveryOptions.status).toBe(201);
    const replacementCredential = virtualRegistration(recoveryOptions.body.options.challenge);
    const recoveryVerify = await request(app.getHttpServer())
      .post("/api/v1/auth/owner/recovery/verify")
      .set("Origin", webOrigin)
      .send({
        email: bootstrapEmail,
        code: recoveryCode,
        ceremonyId: recoveryOptions.body.ceremonyId,
        response: replacementCredential.response
      });
    expect(recoveryVerify.status).toBe(201);
    const recoveryCookie = cookieFrom(recoveryVerify);
    expect(JSON.stringify(recoveryVerify.body)).not.toContain(cookieSecret(recoveryCookie));
    expect((await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", loginCookie)).status).toBe(401);
    expect((await database.prisma.ownerRecoveryCode.findUniqueOrThrow({ where: { id: storedCode.id } })).usedAt).toBeInstanceOf(Date);
    expect((await database.prisma.passkeyCredential.findUniqueOrThrow({ where: { credentialId: firstCredential.credential.id } })).revokedAt).toBeInstanceOf(Date);

    const recoveredSession = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", recoveryCookie);
    expect(recoveredSession.status).toBe(200);
    expect(recoveredSession.body).toMatchObject({ ownerSetupRequired: true, activePasskeyCount: 1 });
    const recoveredCsrf = recoveredSession.body.csrfToken as string;
    const recoveredSecondOptions = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/register/options")
      .set("Cookie", recoveryCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", recoveredCsrf);
    const recoveredSecondCredential = virtualRegistration(recoveredSecondOptions.body.options.challenge);
    const recoveredSecondRegistration = await request(app.getHttpServer())
      .post("/api/v1/auth/passkey/register/verify")
      .set("Cookie", recoveryCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", recoveredCsrf)
      .send({ ceremonyId: recoveredSecondOptions.body.ceremonyId, response: recoveredSecondCredential.response });
    expect(recoveredSecondRegistration.status).toBe(201);
    const replacementCodeResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/owner/recovery-code")
      .set("Cookie", recoveryCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", recoveredCsrf);
    expect(replacementCodeResponse.status).toBe(201);
    const replacementCode = replacementCodeResponse.body.recoveryCode as string;
    const replacementAck = await request(app.getHttpServer())
      .post("/api/v1/auth/owner/recovery-code/ack")
      .set("Cookie", recoveryCookie)
      .set("Origin", webOrigin)
      .set("x-csrf-token", recoveredCsrf)
      .send({ confirmedStoredOffline: true });
    expect(replacementAck.status).toBe(204);
    const recoveredReady = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", recoveryCookie);
    expect(recoveredReady.body).toMatchObject({ ownerSetupRequired: false, activePasskeyCount: 2 });

    const replay = await request(app.getHttpServer())
      .post("/api/v1/auth/owner/recovery/options")
      .set("Origin", webOrigin)
      .send({ email: bootstrapEmail, code: recoveryCode });
    expect(replay.status).toBe(401);
    expect(JSON.stringify(replay.body)).not.toContain(recoveryCode);
    expect(await database.prisma.ownerRecoveryCode.findUnique({ where: { codeHash: digest(replacementCode) } })).toMatchObject({ acknowledgedAt: expect.any(Date) });
  });

  it("lets a ready Owner force logout staff sessions and records the reason", async () => {
    const owner = await fixture({ kind: AccountKind.OWNER });
    const staff = await fixture();
    const secondStaffSecret = newSecret();
    const secondStaffCsrf = createHmac("sha256", secondStaffSecret).update("csrf").digest("base64url");
    const secondStaffSessionId = (await database.prisma.session.create({
      data: {
        accountId: staff.account.id,
        tokenHash: digest(secondStaffSecret),
        csrfTokenHash: digest(secondStaffCsrf),
        expiresAt: new Date(Date.now() + 60 * 60_000),
        userAgent: "S02 second device"
      }
    })).id;
    await database.prisma.passkeyCredential.createMany({
      data: ["owner-passkey-one", "owner-passkey-two"].map((credentialId) => ({
        accountId: owner.account.id,
        credentialId,
        publicKey: Buffer.from([1, 2, 3]),
        counter: 0n,
        transports: ["internal"]
      }))
    });
    await database.prisma.ownerRecoveryCode.create({
      data: {
        accountId: owner.account.id,
        codeHash: digest(newSecret()),
        acknowledgedAt: new Date()
      }
    });

    const ownerSession = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", `sense_sid=${owner.secret}`);
    expect(ownerSession.status).toBe(200);
    const forced = await request(app.getHttpServer())
      .post(`/api/v1/auth/staff/${staff.account.id}/revoke-sessions`)
      .set("Cookie", `sense_sid=${owner.secret}`)
      .set("Origin", webOrigin)
      .set("x-csrf-token", owner.csrfToken)
      .send({ reason: "Staff member reported the devices lost" });
    expect(forced.status).toBe(201);
    expect(forced.body).toEqual({ revokedSessions: 2 });
    const rows = await database.prisma.session.findMany({ where: { accountId: staff.account.id } });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toContain(secondStaffSessionId);
    expect(rows.every((row) => row.revokedAt instanceof Date)).toBe(true);
    const event = await database.prisma.securityEvent.findFirst({
      where: { eventType: "SESSION_REVOKED", actorId: owner.account.id, subjectId: staff.account.id }
    });
    expect(event).toMatchObject({ result: "SUCCESS", metadata: { reason: "Staff member reported the devices lost" } });
    const denied = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", `sense_sid=${staff.secret}`);
    const deniedSecond = await request(app.getHttpServer()).get("/api/v1/auth/session").set("Cookie", `sense_sid=${secondStaffSecret}`);
    expect(denied.status).toBe(401);
    expect(deniedSecond.status).toBe(401);
  });
});

function cookieFrom(response: { headers: Record<string, string | string[] | undefined> }): string {
  const cookie = response.headers["set-cookie"];
  const header = Array.isArray(cookie) ? cookie.find((entry) => entry.startsWith("sense_sid=")) : cookie;
  if (!header?.startsWith("sense_sid=")) throw new Error("Expected an authenticated session cookie");
  return header.split(";")[0]!;
}

function cookieSecret(cookie: string): string {
  return cookie.slice("sense_sid=".length);
}
