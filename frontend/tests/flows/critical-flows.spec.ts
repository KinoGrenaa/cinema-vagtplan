import { expect, test, type Page, type Route } from "@playwright/test";

const API_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1):3001\/.*$/;
const ALL_MODULES = [
  "SCHEDULE",
  "SHIFT_PLANNING",
  "TIME_TRACKING",
  "PAYROLL",
  "LEAVE",
  "SHIFT_TRADES",
  "STAFFING_REQUESTS",
  "MESSAGES",
  "EMPLOYEE_DOCUMENTS",
  "STAFFING_AI",
] as const;

type Role = "MASTER" | "ADMIN" | "EMPLOYEE";
type FlowUser = {
  id: number;
  email: string;
  role: Role;
  cinemaId: number | null;
  firstName: string;
  lastName: string;
};
type MockOptions = {
  loginStatus?: number;
  loginUser?: FlowUser;
  defaultCinema?: { id: number; name: string; logoUrl?: string | null } | null;
  overviewMode?: "SINGLE_CINEMA" | "MULTI_CINEMA" | "MASTER";
  overviewStatus?: number;
  enabledModules?: readonly string[];
};
type RecordedCall = {
  method: string;
  pathname: string;
  authorization: string | null;
  cinemaId: string | null;
};

function createUser(role: Role, overrides: Partial<FlowUser> = {}): FlowUser {
  return {
    id: role === "MASTER" ? 1 : role === "ADMIN" ? 2 : 3,
    email: `${role.toLowerCase()}@example.test`,
    role,
    cinemaId: role === "MASTER" ? null : 1,
    firstName: role === "MASTER" ? "Maja" : role === "ADMIN" ? "Anna" : "Emil",
    lastName: "Test",
    ...overrides,
  };
}

function cinemaOverview(mode: MockOptions["overviewMode"], user: FlowUser) {
  if (mode === "MASTER") {
    return {
      mode: "MASTER",
      activeCinemaCount: 0,
      defaultCinemaId: null,
      cinemas: [],
    };
  }

  const cinemas = [
    {
      cinemaId: 1,
      name: "Kino Grenaa",
      logoUrl: null,
      role: user.role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
      isDefault: true,
      permissions: {
        canManageSchedule: user.role === "ADMIN",
        canManageUsers: user.role === "ADMIN",
        canManagePayroll: user.role === "ADMIN",
        canManageLeaveRequests: user.role === "ADMIN",
        canManageCinemaSettings: user.role === "ADMIN",
        canSendBroadcastMessages: user.role === "ADMIN",
      },
      attention: {
        severity: "NONE",
        actionRequiredCount: 0,
        informationalCount: 0,
        label: "Ingen aktuelle opgaver",
        items: [],
      },
      nextShift: null,
      nextShifts: [],
    },
  ];

  if (mode === "MULTI_CINEMA") {
    cinemas.push({
      ...cinemas[0],
      cinemaId: 2,
      name: "Kino Ebeltoft",
      isDefault: false,
    });
  }

  return {
    mode,
    activeCinemaCount: cinemas.length,
    defaultCinemaId: 1,
    cinemas,
  };
}

function activeCinemaOptions(mode: MockOptions["overviewMode"], user: FlowUser) {
  const overview = cinemaOverview(mode, user);
  return {
    role: user.role,
    defaultCinemaId: overview.defaultCinemaId,
    allowNoDefault: user.role === "MASTER",
    cinemas: overview.cinemas.map((cinema) => ({
      id: cinema.cinemaId,
      name: cinema.name,
      logoUrl: cinema.logoUrl,
      isDefault: cinema.isDefault,
    })),
  };
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type,x-cinema-id",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
}

async function installApiMocks(page: Page, options: MockOptions = {}) {
  const loginUser = options.loginUser ?? createUser("ADMIN");
  const overviewMode = options.overviewMode ?? "SINGLE_CINEMA";
  const enabledModules = new Set(options.enabledModules ?? ALL_MODULES);
  const calls: RecordedCall[] = [];

  await page.route(API_PATTERN, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    calls.push({
      method,
      pathname,
      authorization: request.headers()["authorization"] ?? null,
      cinemaId: request.headers()["x-cinema-id"] ?? null,
    });

    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "authorization,content-type,x-cinema-id",
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
        },
      });
      return;
    }

    if (pathname === "/auth/login") {
      const status = options.loginStatus ?? 200;
      if (status !== 200) {
        await fulfillJson(route, status, { message: "Unauthorized" });
        return;
      }
      await fulfillJson(route, 200, {
        access_token: "flow-test-token",
        user: loginUser,
        defaultCinema: options.defaultCinema,
      });
      return;
    }

    if (pathname === "/auth/cinema-start-overview") {
      const status = options.overviewStatus ?? 200;
      if (status !== 200) {
        await fulfillJson(route, status, { message: "Session udløbet" });
        return;
      }
      await fulfillJson(route, 200, cinemaOverview(overviewMode, loginUser));
      return;
    }

    if (pathname === "/time-entries/open") {
      await fulfillJson(route, 404, { message: "Ingen åben tidsregistrering" });
      return;
    }

    if (pathname === "/auth/default-cinema-options") {
      await fulfillJson(route, 200, activeCinemaOptions(overviewMode, loginUser));
      return;
    }

    if (pathname === "/cinema-modules/current") {
      await fulfillJson(route, 200, {
        modules: ALL_MODULES.map((key) => ({
          key,
          name: key,
          enabled: enabledModules.has(key),
        })),
      });
      return;
    }

    if (
      pathname.endsWith("/pool-count") ||
      pathname.endsWith("/direct-count") ||
      pathname.endsWith("/unread-count")
    ) {
      await fulfillJson(route, 200, { count: 0 });
      return;
    }

    if (
      pathname === "/staffing-requests/mine" ||
      pathname === "/leave-requests" ||
      pathname === "/shift-trades" ||
      pathname === "/shifts" ||
      pathname === "/movie-showings" ||
      pathname === "/time-entries/me-period"
    ) {
      await fulfillJson(route, 200, []);
      return;
    }

    await fulfillJson(route, 200, method === "GET" ? [] : {});
  });

  return calls;
}

async function setAuthenticatedState(
  page: Page,
  user: FlowUser,
  masterCinema?: { id: number; name: string },
) {
  await page.addInitScript(
    ({ currentUser, selectedCinema }) => {
      const seedKey = "frontendFlowAuthSeeded";
      if (sessionStorage.getItem(seedKey) === "true") return;
      sessionStorage.setItem(seedKey, "true");

      localStorage.setItem("token", "flow-test-token");
      localStorage.setItem("user", JSON.stringify(currentUser));
      if (selectedCinema) {
        localStorage.setItem("masterSelectedCinemaId", String(selectedCinema.id));
        localStorage.setItem("masterSelectedCinemaName", selectedCinema.name);
      } else {
        localStorage.removeItem("masterSelectedCinemaId");
        localStorage.removeItem("masterSelectedCinemaName");
        localStorage.removeItem("masterSelectedCinemaLogoUrl");
      }
    },
    { currentUser: user, selectedCinema: masterCinema },
  );
}

function emailInput(page: Page) {
  return page.locator('input[type="email"]');
}

function passwordInput(page: Page) {
  return page.locator('input[type="password"]');
}

async function waitForModules(calls: RecordedCall[]) {
  await expect
    .poll(() => calls.some((call) => call.pathname === "/cinema-modules/current"))
    .toBe(true);
}

async function waitForPath(page: Page, pathname: string) {
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(pathname);
}

async function openMenu(page: Page) {
  const button = page.getByRole("button", { name: "Åbn menu" });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByRole("heading", { name: "Cinema Vagtplan" })).toBeVisible();
}

test("forkert login viser dansk og handlingsklar fejl", async ({ page }) => {
  await installApiMocks(page, { loginStatus: 401 });
  await page.goto("/");

  await emailInput(page).fill("forkert@example.test");
  await passwordInput(page).fill("forkert");
  await page.getByRole("button", { name: "Log ind" }).click();

  await expect(page.getByText("Login mislykkedes", { exact: true })).toBeVisible();
  await expect(
    page.getByText("E-mail eller adgangskode er forkert. Prøv igen."),
  ).toBeVisible();
});

test("ADMIN logger ind på én biograf, ser startsiden og kan logge ud", async ({ page }) => {
  const admin = createUser("ADMIN");
  const calls = await installApiMocks(page, {
    loginUser: admin,
    overviewMode: "SINGLE_CINEMA",
  });
  await page.goto("/");

  await emailInput(page).fill(admin.email);
  await passwordInput(page).fill("hemmelig");
  await page.getByRole("button", { name: "Log ind" }).click();

  await waitForPath(page, "/home");
  await expect(page.getByRole("heading", { name: "Min dag" })).toBeVisible();
  await expect(
    page.getByText("Aktiv biograf: Kino Grenaa", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: "Driftsoverblik" }),
  ).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.pathname === "/auth/cinema-start-overview" &&
        call.authorization === "Bearer flow-test-token",
    ),
  ).toBe(true);

  await openMenu(page);
  await page.getByRole("button", { name: "Log ud" }).click();
  await waitForPath(page, "/");
  await expect(page.getByRole("button", { name: "Log ind" })).toBeVisible();
  await expect(
    page.evaluate(() => ({
      token: localStorage.getItem("token"),
      user: localStorage.getItem("user"),
    })),
  ).resolves.toEqual({ token: null, user: null });
});

test("medarbejder med flere biografer sendes til biografvalg", async ({ page }) => {
  const employee = createUser("EMPLOYEE");
  await installApiMocks(page, {
    loginUser: employee,
    overviewMode: "MULTI_CINEMA",
  });
  await page.goto("/");

  await emailInput(page).fill(employee.email);
  await passwordInput(page).fill("hemmelig");
  await page.getByRole("button", { name: "Log ind" }).click();

  await waitForPath(page, "/select-cinema");
});

test("MASTER-login med standardbiograf gemmer kontekst og sender X-Cinema-Id", async ({ page }) => {
  const master = createUser("MASTER");
  const calls = await installApiMocks(page, {
    loginUser: master,
    overviewMode: "MASTER",
    defaultCinema: { id: 7, name: "Kino Grenaa" },
  });
  await page.goto("/");

  await emailInput(page).fill(master.email);
  await passwordInput(page).fill("hemmelig");
  await page.getByRole("button", { name: "Log ind" }).click();

  await waitForPath(page, "/dashboard");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        id: localStorage.getItem("masterSelectedCinemaId"),
        name: localStorage.getItem("masterSelectedCinemaName"),
      })),
    )
    .toEqual({ id: "7", name: "Kino Grenaa" });
  await expect
    .poll(() =>
      calls.some(
        (call) =>
          call.pathname === "/cinema-modules/current" &&
          call.cinemaId === "7" &&
          call.authorization === "Bearer flow-test-token",
      ),
    )
    .toBe(true);
});

test("MASTER uden standardbiograf får tydelig valgtilstand", async ({ page }) => {
  const master = createUser("MASTER");
  await installApiMocks(page, {
    loginUser: master,
    overviewMode: "MASTER",
    defaultCinema: null,
  });
  await page.goto("/");

  await emailInput(page).fill(master.email);
  await passwordInput(page).fill("hemmelig");
  await page.getByRole("button", { name: "Log ind" }).click();

  await waitForPath(page, "/dashboard");
  await expect(page.getByText("Ingen aktiv biograf valgt").first()).toBeVisible();
  await expect(
    page.evaluate(() => localStorage.getItem("masterSelectedCinemaId")),
  ).resolves.toBeNull();
});

test("uautoriseret adgang til personlig startside sendes til login", async ({ page }) => {
  await installApiMocks(page);
  await page.goto("/home");
  await waitForPath(page, "/");
  await expect(page.getByRole("button", { name: "Log ind" })).toBeVisible();
});

test("medarbejdermenu skjuler administrative områder", async ({ page }) => {
  const employee = createUser("EMPLOYEE");
  const calls = await installApiMocks(page, { loginUser: employee });
  await setAuthenticatedState(page, employee);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Min dag" })).toBeVisible();
  await waitForModules(calls);

  await openMenu(page);
  await expect(page.getByRole("link", { name: "Startside" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vagtplan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tid & fravær" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Beskeder" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Planlægning" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Medarbejdere & løn" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "System" })).toHaveCount(0);
});

test("ADMIN-menu viser administration men ikke MASTER-funktioner", async ({ page }) => {
  const admin = createUser("ADMIN");
  const calls = await installApiMocks(page, { loginUser: admin });
  await setAuthenticatedState(page, admin);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Min dag" })).toBeVisible();
  await waitForModules(calls);

  await openMenu(page);
  await expect(page.getByRole("button", { name: "Planlægning" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Medarbejdere & løn" })).toBeVisible();
  await page.getByRole("button", { name: "System" }).click();
  await expect(page.getByRole("link", { name: "Biografindstillinger" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Auditlog" })).toBeVisible();
  await expect(page.getByRole("link", { name: "MASTER-panel" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Systemfejl" })).toHaveCount(0);
});

test("MASTER-menu viser systemfunktioner og skjuler personlig startside", async ({ page }) => {
  const master = createUser("MASTER");
  const calls = await installApiMocks(page, {
    loginUser: master,
    overviewMode: "MASTER",
  });
  await setAuthenticatedState(page, master, { id: 7, name: "Kino Grenaa" });
  await page.goto("/dashboard");
  await waitForModules(calls);

  await openMenu(page);
  await expect(page.getByRole("link", { name: "Startside" })).toHaveCount(0);
  await page.getByRole("button", { name: "System" }).click();
  await expect(page.getByRole("link", { name: "MASTER-panel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Systemfejl" })).toBeVisible();
});

test("deaktiveret lønmodul skjules i menuen og blokerer direkte route", async ({ page }) => {
  const admin = createUser("ADMIN");
  const enabledModules = ALL_MODULES.filter((key) => key !== "PAYROLL");
  const calls = await installApiMocks(page, {
    loginUser: admin,
    enabledModules,
  });
  await setAuthenticatedState(page, admin);
  await page.goto("/payroll");
  await waitForModules(calls);

  await expect(page.getByRole("heading", { name: "Modulet er ikke aktivt" })).toBeVisible();
  await openMenu(page);
  await page.getByRole("button", { name: "Medarbejdere & løn" }).click();
  await expect(page.getByRole("link", { name: "Brugere" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Løn", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Lønarter" })).toHaveCount(0);
  const payrollCalls = calls.filter((call) => call.pathname.startsWith("/payroll"));
  expect(payrollCalls, `Uventede løn-API-kald: ${JSON.stringify(payrollCalls)}`).toEqual([]);
});

test("401 fra apiFetch rydder sessionen og sender brugeren til login", async ({ page }) => {
  const admin = createUser("ADMIN");
  await installApiMocks(page, {
    loginUser: admin,
    overviewStatus: 401,
  });
  await setAuthenticatedState(page, admin);
  await page.goto("/home");

  await waitForPath(page, "/");
  await expect(page.getByRole("button", { name: "Log ind" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        token: localStorage.getItem("token"),
        user: localStorage.getItem("user"),
      })),
    )
    .toEqual({ token: null, user: null });
});
