// Visual proof of the user token lifecycle, and that a rights change keeps the token and the
// password. Each card on screen puts what the front gets
// next to what the users table really holds, read straight from the database.
//
// Needs a server running the current code with auth "local" on SLS_PROOF_URL, and writes
// three throwaway accounts in the database of config/mainConfig.json, deleted at the end.
//   PORT=3012 node ./bin/www
//   npx playwright test tests/e2e/auth/userToken.spec.js --headed --reporter=html

import { test, expect, request as playwrightRequest } from "@playwright/test";
import { createHash, randomBytes } from "crypto";
import { userModel } from "../../../model/users.js";
import { readMainConfig } from "../../../model/config.js";
import { getKnexConnection, cleanupConnection } from "../../../model/utils.js";

const baseUrl = process.env.SLS_PROOF_URL || "http://localhost:3012";
const initialGroup = "IDCPDatareader";
const addedGroup = "admin";
const unknownToken = "sls-doesnotexist";
const millisecondsToReadACard = 2500;
const successiveWhoamiCalls = 3;
const bcryptHashRegex = /^\$2b\$/;

const proofAccounts = {
    admin: { login: "sls_proof_admin", group: "admin", password: randomBytes(12).toString("hex") },
    withToken: { login: "sls_proof_user", group: initialGroup, password: randomBytes(12).toString("hex") },
    withoutToken: { login: "sls_proof_notoken", group: initialGroup, password: randomBytes(12).toString("hex") },
};

const proofPanel = { banner: "", cards: [] };

const tokenFingerprint = (token) => {
    if (!token) {
        return "vide";
    }
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return `sls-... empreinte ${tokenHash.substring(0, 8)}`;
};

const describeStoredPassword = (storedPassword) => {
    if (!storedPassword) {
        return "vide";
    }
    if (!bcryptHashRegex.test(storedPassword)) {
        return "en clair";
    }
    const passwordHashFingerprint = createHash("sha256").update(storedPassword).digest("hex");
    return `haché bcrypt, empreinte ${passwordHashFingerprint.substring(0, 8)}`;
};

const readStoredAccount = async (login) => {
    const connection = getKnexConnection(readMainConfig().database);
    const storedAccount = await connection.select("token", "password", "profiles").from("users").where("login", login).first();
    cleanupConnection(connection);
    return storedAccount;
};

const clearStoredToken = async (login) => {
    const connection = getKnexConnection(readMainConfig().database);
    await connection("users").update({ token: "" }).where("login", login);
    cleanupConnection(connection);
};

const postLogin = async (session, login, password) => {
    const loginResponse = await session.post("/auth/login", { form: { username: login, password: password }, maxRedirects: 0 });
    const redirectLocation = loginResponse.headers().location || "";
    return !redirectLocation.includes("/login");
};

const openUserSession = async (account) => {
    const session = await playwrightRequest.newContext({ baseURL: baseUrl });
    const isLoggedIn = await postLogin(session, account.login, account.password);
    expect(isLoggedIn, `login of ${account.login}`).toBe(true);
    return session;
};

const canLogIn = async (login, password) => {
    const session = await playwrightRequest.newContext({ baseURL: baseUrl });
    const isLoggedIn = await postLogin(session, login, password);
    await session.dispose();
    return isLoggedIn;
};

const callWhoami = async (session) => {
    const whoamiResponse = await session.get("/api/v1/auth/whoami");
    const whoami = await whoamiResponse.json();
    return whoami.user.token;
};

const callMeWithBearer = async (token) => {
    const anonymousClient = await playwrightRequest.newContext({ baseURL: baseUrl, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    const meResponse = await anonymousClient.get("/api/v1/users/me");
    const meBody = meResponse.status() === 200 ? await meResponse.json() : {};
    await anonymousClient.dispose();
    return { status: meResponse.status(), groups: meBody.groups || [] };
};

const renderProofPanel = async (page) => {
    await page.evaluate((panelState) => {
        let panelElement = document.getElementById("token-proof-panel");
        if (!panelElement) {
            panelElement = document.createElement("div");
            panelElement.id = "token-proof-panel";
            panelElement.style.cssText =
                "position:fixed;top:0;right:0;width:520px;height:100vh;overflow-y:auto;z-index:2147483647;pointer-events:none;" +
                "background:#0f172a;color:#e2e8f0;font:14px/1.4 system-ui,sans-serif;padding:12px;box-sizing:border-box;";
            document.body.appendChild(panelElement);
        }
        const cardsHtml = panelState.cards.map((card) => {
            const verdictColor = card.isPass === null ? "#64748b" : card.isPass ? "#16a34a" : "#dc2626";
            const verdictLabel = card.isPass === null ? "OBSERVATION" : card.isPass ? "OK" : "ECHEC";
            const frontLines = card.front.map((line) => `<div>${line}</div>`).join("");
            const backLines = card.back.map((line) => `<div>${line}</div>`).join("");
            return (
                `<div style="border:3px solid ${verdictColor};border-radius:8px;margin:10px 0;padding:8px;background:#1e293b">` +
                `<div style="display:flex;justify-content:space-between;font-weight:700"><span>${card.title}</span>` +
                `<span style="background:${verdictColor};color:white;padding:0 8px;border-radius:4px">${verdictLabel}</span></div>` +
                `<div style="color:#fde68a;margin:4px 0">Attendu : ${card.expected}</div>` +
                `<div style="display:flex;gap:8px">` +
                `<div style="flex:1;background:#0f172a;padding:6px;border-radius:4px"><b style="color:#93c5fd">FRONT (API)</b>${frontLines}</div>` +
                `<div style="flex:1;background:#0f172a;padding:6px;border-radius:4px"><b style="color:#fca5a5">BACK (base users)</b>${backLines}</div>` +
                `</div></div>`
            );
        });
        const bannerHtml = `<div style="position:sticky;top:0;z-index:1;background:#facc15;color:#0f172a;font-weight:700;font-size:16px;padding:10px;border-radius:6px">${panelState.banner}</div>`;
        panelElement.innerHTML = bannerHtml + cardsHtml.join("");
        panelElement.scrollTop = panelElement.scrollHeight;
    }, proofPanel);
};

const announce = async (page, banner) => {
    proofPanel.banner = banner;
    await renderProofPanel(page);
};

const showCard = async (page, card) => {
    proofPanel.cards.push(card);
    await renderProofPanel(page);
    await page.waitForTimeout(millisecondsToReadACard);
    await test.info().attach(card.title, { body: await page.screenshot(), contentType: "image/png" });
    if (card.isPass !== null) {
        expect.soft(card.isPass, card.title).toBe(true);
    }
};

const removeProofAccounts = async () => {
    for (const account of Object.values(proofAccounts)) {
        await userModel.deleteUserAccount(account.login);
    }
};

test.use({
    viewport: { width: 1920, height: 1000 },
    video: { mode: "on", size: { width: 1920, height: 1000 } },
    trace: "on",
    launchOptions: { slowMo: 250 },
});

test.afterAll(async () => {
    await removeProofAccounts();
});

test("un changement de droits garde le token, whoami en donne un à qui n'en a pas", async ({ page }) => {
    test.setTimeout(240000);
    page.setDefaultTimeout(30000);

    await test.step("Préparation : trois comptes jetables", async () => {
        await removeProofAccounts();
        for (const account of Object.values(proofAccounts)) {
            await userModel.addUserAccount({ login: account.login, password: account.password, groups: [account.group], source: "database" });
        }
        await clearStoredToken(proofAccounts.withoutToken.login);

        await page.goto(`${baseUrl}/login`);
        await announce(page, "Préparation : comptes de test créés en base");
        const storedWithToken = await readStoredAccount(proofAccounts.withToken.login);
        const storedWithoutToken = await readStoredAccount(proofAccounts.withoutToken.login);
        await showCard(page, {
            title: "0. État de départ",
            expected: "sls_proof_user a un token, sls_proof_notoken n'en a pas",
            front: ["aucun appel"],
            back: [`sls_proof_user : ${tokenFingerprint(storedWithToken.token)}`, `sls_proof_notoken : ${tokenFingerprint(storedWithoutToken.token)}`],
            isPass: Boolean(storedWithToken.token) && !storedWithoutToken.token,
        });
    });

    await test.step("Scénario 1 : compte sans token en base, whoami lui en donne un", async () => {
        await announce(page, "Scénario 1 : sls_proof_notoken n'a jamais eu de token. Il se connecte et appelle whoami.");
        const storedBefore = await readStoredAccount(proofAccounts.withoutToken.login);
        const session = await openUserSession(proofAccounts.withoutToken);
        const whoamiToken = await callWhoami(session);
        const storedAfter = await readStoredAccount(proofAccounts.withoutToken.login);
        const meWithToken = await callMeWithBearer(whoamiToken);
        await session.dispose();

        await showCard(page, {
            title: "1. whoami donne un token à un compte qui n'en a pas",
            expected: "base vide avant, whoami renvoie un token sls-, la base contient ce même token, il ouvre /users/me",
            front: [`whoami : ${tokenFingerprint(whoamiToken)}`, `/users/me avec ce token : HTTP ${meWithToken.status}`],
            back: [`avant whoami : ${tokenFingerprint(storedBefore.token)}`, `après whoami : ${tokenFingerprint(storedAfter.token)}`],
            isPass: !storedBefore.token && Boolean(whoamiToken) && whoamiToken.startsWith("sls-") && storedAfter.token === whoamiToken && meWithToken.status === 200,
        });
    });

    const userSession = await openUserSession(proofAccounts.withToken);
    let firstToken;

    await test.step("Scénario 2 : l'admin change les droits dans l'admin UI", async () => {
        await announce(page, "Scénario 2 : sls_proof_user a un token. L'admin change ses profils dans la vraie admin UI.");
        firstToken = await callWhoami(userSession);
        const storedBefore = await readStoredAccount(proofAccounts.withToken.login);
        await showCard(page, {
            title: "2a. Token avant le changement de droits",
            expected: "whoami et la base donnent le même token",
            front: [`whoami : ${tokenFingerprint(firstToken)}`],
            back: [`token : ${tokenFingerprint(storedBefore.token)}`, `profils : ${storedBefore.profiles}`],
            isPass: Boolean(firstToken) && storedBefore.token === firstToken,
        });

        await page.fill("#username", proofAccounts.admin.login);
        await page.fill("#password", proofAccounts.admin.password);
        await page.click("button[type=submit]");
        await page.waitForURL("**/vocables**");
        await page.goto(`${baseUrl}/vocables/?tool=ConfigEditor`);
        await page.getByRole("tab", { name: "Users" }).click();
        await announce(page, `Scénario 2 : l'admin ouvre la fiche de sls_proof_user et lui ajoute le profil ${addedGroup}`);
        await page.getByLabel("Search Users by login").fill(proofAccounts.withToken.login);
        const userRow = page.getByRole("row").filter({ hasText: proofAccounts.withToken.login });
        await userRow.getByRole("button", { name: "edit" }).click();
        await page.locator("#select-groups").click();
        await page.getByRole("option", { name: addedGroup, exact: true }).click();
        await page.keyboard.press("Escape");

        const sentRequestPromise = page.waitForRequest((sentRequest) => sentRequest.url().includes("/api/v1/admin/users") && sentRequest.method() === "PUT");
        await page.getByRole("button", { name: "Save User" }).click();
        const sentRequest = await sentRequestPromise;
        await page.waitForResponse((receivedResponse) => receivedResponse.url().includes("/api/v1/admin/users") && receivedResponse.request().method() === "PUT");
        await renderProofPanel(page);

        const sentAccounts = Object.values(sentRequest.postDataJSON());
        const sentAccount = sentAccounts[0];
        const sentFieldNames = Object.keys(sentAccount);
        const storedAfter = await readStoredAccount(proofAccounts.withToken.login);
        const meWithFirstToken = await callMeWithBearer(firstToken);
        const whoamiTokenAfter = await callWhoami(userSession);

        await showCard(page, {
            title: "2b. Le changement de droits garde le token",
            expected: "le PUT de l'admin UI n'envoie pas de token, la base garde le même, l'ancien token marche et voit le nouveau profil",
            front: [
                `PUT envoyé, champs : ${sentFieldNames.join(", ")}`,
                `token dans le PUT : ${"token" in sentAccount ? "présent" : "absent"}`,
                `/users/me ancien token : HTTP ${meWithFirstToken.status}, profils ${meWithFirstToken.groups.join(", ")}`,
                `whoami : ${tokenFingerprint(whoamiTokenAfter)}`,
            ],
            back: [`token avant : ${tokenFingerprint(storedBefore.token)}`, `token après : ${tokenFingerprint(storedAfter.token)}`, `profils après : ${storedAfter.profiles}`],
            isPass: !("token" in sentAccount) && storedAfter.token === firstToken && meWithFirstToken.status === 200 && meWithFirstToken.groups.includes(addedGroup) && whoamiTokenAfter === firstToken,
        });

        const canLogInWithOwnPassword = await canLogIn(proofAccounts.withToken.login, proofAccounts.withToken.password);
        const canLogInWithEmptyPassword = await canLogIn(proofAccounts.withToken.login, "");
        await showCard(page, {
            title: "2c. Le changement de droits garde le mot de passe",
            expected: "le PUT n'envoie pas de mot de passe, la base garde le même hash, le login marche avec le vrai mot de passe et pas avec un vide",
            front: [
                `password dans le PUT : ${"password" in sentAccount ? "présent" : "absent"}`,
                `login avec son mot de passe : ${canLogInWithOwnPassword ? "accepté" : "refusé"}`,
                `login avec mot de passe vide : ${canLogInWithEmptyPassword ? "accepté" : "refusé"}`,
            ],
            back: [`avant : ${describeStoredPassword(storedBefore.password)}`, `après : ${describeStoredPassword(storedAfter.password)}`],
            isPass:
                !("password" in sentAccount) && bcryptHashRegex.test(storedBefore.password) && storedAfter.password === storedBefore.password && canLogInWithOwnPassword && !canLogInWithEmptyPassword,
        });
    });

    let regeneratedToken;

    await test.step("Scénario 3 : token effacé après coup, whoami le régénère", async () => {
        await announce(page, "Scénario 3 : le token de sls_proof_user est effacé en base, comme l'ancien bug le faisait. Il appelle whoami.");
        await clearStoredToken(proofAccounts.withToken.login);
        const storedBefore = await readStoredAccount(proofAccounts.withToken.login);
        const meWithFirstToken = await callMeWithBearer(firstToken);
        regeneratedToken = await callWhoami(userSession);
        const storedAfter = await readStoredAccount(proofAccounts.withToken.login);
        const meWithRegeneratedToken = await callMeWithBearer(regeneratedToken);

        await showCard(page, {
            title: "3. whoami régénère un token effacé",
            expected: "l'ancien token est refusé, whoami en donne un nouveau, c'est lui qui est en base et il marche",
            front: [`/users/me ancien token : HTTP ${meWithFirstToken.status}`, `whoami : ${tokenFingerprint(regeneratedToken)}`, `/users/me nouveau token : HTTP ${meWithRegeneratedToken.status}`],
            back: [`après effacement : ${tokenFingerprint(storedBefore.token)}`, `après whoami : ${tokenFingerprint(storedAfter.token)}`],
            isPass:
                !storedBefore.token &&
                meWithFirstToken.status === 401 &&
                Boolean(regeneratedToken) &&
                regeneratedToken !== firstToken &&
                storedAfter.token === regeneratedToken &&
                meWithRegeneratedToken.status === 200,
        });
    });

    await test.step("Scénario 4 : le token reste stable", async () => {
        await announce(page, "Scénario 4 : sls_proof_user appelle whoami trois fois de suite.");
        const successiveTokens = [];
        for (let callIndex = 0; callIndex < successiveWhoamiCalls; callIndex++) {
            successiveTokens.push(await callWhoami(userSession));
        }
        const storedAfter = await readStoredAccount(proofAccounts.withToken.login);
        const successiveFingerprints = successiveTokens.map((token) => tokenFingerprint(token));
        const differentTokens = successiveTokens.filter((token) => token !== regeneratedToken);

        await showCard(page, {
            title: "4. whoami ne régénère pas à chaque appel",
            expected: "trois fois le même token, la base n'a pas changé",
            front: successiveFingerprints.map((fingerprint, callIndex) => `whoami ${callIndex + 1} : ${fingerprint}`),
            back: [`token : ${tokenFingerprint(storedAfter.token)}`],
            isPass: differentTokens.length === 0 && storedAfter.token === regeneratedToken,
        });
    });
    await userSession.dispose();

    await test.step("Scénario 5 : un token inventé est refusé", async () => {
        await announce(page, "Scénario 5 : contrôle négatif avec un token qui n'existe pas.");
        const meWithUnknownToken = await callMeWithBearer(unknownToken);
        await showCard(page, {
            title: "5. Token inventé",
            expected: "HTTP 401",
            front: [`/users/me avec ${unknownToken} : HTTP ${meWithUnknownToken.status}`],
            back: ["aucun compte n'a ce token"],
            isPass: meWithUnknownToken.status === 401,
        });
    });

    await test.step("Nettoyage : suppression des comptes de test", async () => {
        await announce(page, "Nettoyage : suppression des trois comptes de test.");
        await removeProofAccounts();
        const remainingAccounts = [];
        for (const account of Object.values(proofAccounts)) {
            const storedAccount = await readStoredAccount(account.login);
            remainingAccounts.push(`${account.login} : ${storedAccount ? "encore en base" : "supprimé"}`);
        }
        const leftoverAccounts = remainingAccounts.filter((accountState) => accountState.includes("encore"));
        await showCard(page, {
            title: "6. Comptes de test supprimés",
            expected: "plus aucun compte sls_proof_* en base",
            front: ["aucun appel"],
            back: remainingAccounts,
            isPass: leftoverAccounts.length === 0,
        });
    });

    const assertedCards = proofPanel.cards.filter((card) => card.isPass !== null);
    const passedCards = assertedCards.filter((card) => card.isPass);
    await announce(page, `Bilan : ${passedCards.length} / ${assertedCards.length} contrôles OK`);
    await page.waitForTimeout(millisecondsToReadACard * 2);
});
