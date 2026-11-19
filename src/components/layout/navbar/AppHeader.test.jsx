// @vitest-environment jsdom
import { useMemo, useState } from "react";
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";
import uiReducer from "../../../store/slicesAndThunks/uiSlice";
import inboxReducer from "../../../store/slicesAndThunks/inboxSlice/inboxSlice";
import { buildTheme } from "../../../theme/theme";
import { ColorModeContext } from "../../../theme/colorMode";
import { AdminViewContext } from "../adminView";
import { PERSONAL_SHELVES } from "../personalShelves";
import AppHeader from "./AppHeader";

// The header and what hangs off it — the avatar menu and the side drawer —
// against a real store and router. What each role is offered, that the two
// menus offer the same things (both are built from navConfig), and that
// "תצוגת מנהל" hides the management group without taking anything else away.
//
// This is navigation, not access control: the server decides and ProtectedRoute
// redirects. A student shown a link to /admin is a bug about honesty — the kind
// nobody notices, because you have to be signed in as a student to see it.

vi.mock("../../../api/notificationsApi", () => ({
  notificationsApi: { list: vi.fn().mockResolvedValue({ items: [], unread: 0 }), markRead: vi.fn(), markAllRead: vi.fn() },
}));

beforeEach(() => localStorage.clear());

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

// The two providers App gives the shell, with real state so a switch can be
// pressed and seen to change.
const Providers = ({ children }) => {
  const [dark, setDark] = useState(false);
  const [adminOn, setAdminOn] = useState(true);
  const colorMode = useMemo(() => ({ mode: dark ? "dark" : "light", toggle: () => setDark((d) => !d) }), [dark]);
  const adminView = useMemo(() => ({ enabled: adminOn, toggle: () => setAdminOn((v) => !v) }), [adminOn]);
  return (
    <ColorModeContext.Provider value={colorMode}>
      <AdminViewContext.Provider value={adminView}>{children}</AdminViewContext.Provider>
    </ColorModeContext.Provider>
  );
};

const renderHeader = (role, { path = "/archive", signedIn = true } = {}) => {
  const store = configureStore({ reducer: { auth: authReducer, ui: uiReducer, inbox: inboxReducer } });
  if (signedIn) {
    store.dispatch({
      type: "auth/login/fulfilled",
      payload: { user: { id: 1, display_name: "דוד", email: "david@example.test", role } },
    });
  }
  render(
    <Provider store={store}>
      <ThemeProvider theme={buildTheme("light")}>
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Providers>
            <AppHeader />
            <Routes><Route path="*" element={<Where />} /></Routes>
          </Providers>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const headerLinks = () => within(screen.getByRole("banner")).getAllByRole("link").map((a) => a.getAttribute("href"));

const openAvatarMenu = async (user = userEvent.setup()) => {
  await user.click(screen.getByRole("button", { name: /תפריט החשבון/ }));
  return screen.getByRole("menu");
};
const menuHrefs = (menu) => within(menu).getAllByRole("menuitem").map((i) => i.getAttribute("href")).filter(Boolean);

const openDrawer = async (user = userEvent.setup()) => {
  await user.click(screen.getByRole("button", { name: "פתיחת תפריט אישי" }));
  return document.querySelector(".MuiDrawer-paper");
};
const drawerHrefs = (paper) => within(paper).getAllByRole("link").map((a) => a.getAttribute("href"));

describe("the header", () => {
  test("holds the brand and exactly the five places everyone browses", () => {
    renderHeader("admin");
    expect(headerLinks()).toEqual(["/archive", "/archive", "/ask", "/my-courses", "/sessions", "/donate"]);
  });

  test("the page you are on is marked, and the course management page marks nothing", () => {
    renderHeader("lecturer", { path: "/my-courses/7" });
    const nav = screen.getByRole("navigation", { name: "ניווט ראשי" });
    expect(within(nav).getByRole("link", { name: "הקורסים שלי" })).toHaveAttribute("aria-current", "page");
  });

  test("on /courses no link is current", () => {
    renderHeader("lecturer", { path: "/courses" });
    const nav = screen.getByRole("navigation", { name: "ניווט ראשי" });
    expect(within(nav).getAllByRole("link").filter((a) => a.hasAttribute("aria-current"))).toHaveLength(0);
  });

  test("signed out it is only the brand and the language", () => {
    renderHeader(null, { signedIn: false });
    expect(headerLinks()).toEqual(["/archive"]);
    expect(screen.getByRole("button", { name: "שינוי שפה" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /תפריט החשבון/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "התראות" })).toBeNull();
  });

  test("the language and the colour mode are no longer in the header itself", () => {
    renderHeader("student");
    const header = screen.getByRole("banner");
    expect(within(header).queryByRole("button", { name: "שינוי שפה" })).toBeNull();
    expect(within(header).queryByRole("switch")).toBeNull();
  });
});

describe("what each role is offered in the avatar menu", () => {
  test("a student: the shelves and the account, and nothing to manage", async () => {
    renderHeader("student");
    const menu = await openAvatarMenu();
    expect(menuHrefs(menu)).toEqual(["/profile", ...PERSONAL_SHELVES.map((s) => s.path), "/profile"]);
    expect(within(menu).queryByRole("switch", { name: "תצוגת מנהל" })).toBeNull();
    expect(within(menu).queryByText("העלאת מדיה")).toBeNull();
  });

  test("a lecturer: course management and upload, and no admin pages", async () => {
    renderHeader("lecturer");
    const menu = await openAvatarMenu();
    const hrefs = menuHrefs(menu);
    expect(hrefs).toContain("/courses");
    expect(hrefs).not.toContain("/users");
    expect(hrefs).not.toContain("/admin");
    expect(within(menu).getByRole("menuitem", { name: "העלאת מדיה" })).toBeInTheDocument();
  });

  test("an admin: everything, in the spec's order", async () => {
    renderHeader("admin");
    const hrefs = menuHrefs(await openAvatarMenu());
    expect(hrefs.slice(-3)).toEqual(["/admin", "/users", "/courses"]);
  });

  test("an unrecognised role is treated as a student, not as an admin", async () => {
    renderHeader("something-new");
    const hrefs = menuHrefs(await openAvatarMenu());
    expect(hrefs).not.toContain("/admin");
    expect(hrefs).not.toContain("/courses");
  });

  // A menu is not a dialog: the page stays scrollable (theme.js turns the lock
  // off for every Popover).
  test("leaves the page scrollable while it is open", async () => {
    renderHeader("student");
    await openAvatarMenu();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("תצוגת מנהל", () => {
  test("is on by default, and turning it off hides the management group only", async () => {
    const user = userEvent.setup();
    renderHeader("admin");
    let menu = await openAvatarMenu(user);
    const toggle = within(menu).getByRole("switch", { name: "תצוגת מנהל" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    menu = screen.getByRole("menu");
    expect(within(menu).getByRole("switch", { name: "תצוגת מנהל" })).toHaveAttribute("aria-checked", "false");
    const hrefs = menuHrefs(menu);
    for (const to of ["/admin", "/users", "/courses"]) expect(hrefs).not.toContain(to);
    expect(within(menu).queryByRole("menuitem", { name: "העלאת מדיה" })).toBeNull();
    // Nothing personal went with it.
    for (const shelf of PERSONAL_SHELVES) expect(hrefs).toContain(shelf.path);
  });

  test("the menu's upload opens the dialog on the archive", async () => {
    const user = userEvent.setup();
    const store = renderHeader("lecturer", { path: "/ask" });
    const menu = await openAvatarMenu(user);
    await user.click(within(menu).getByRole("menuitem", { name: "העלאת מדיה" }));
    expect(store.getState().ui.isUploadOpen).toBe(true);
    expect(screen.getByTestId("where").textContent).toBe("/archive");
  });
});

describe("מצב כהה", () => {
  test("is a switch in the avatar menu", async () => {
    const user = userEvent.setup();
    renderHeader("student");
    const menu = await openAvatarMenu(user);
    const dark = within(menu).getByRole("switch", { name: "מצב כהה" });
    expect(dark).toHaveAttribute("aria-checked", "false");
    await user.click(dark);
    expect(within(screen.getByRole("menu")).getByRole("switch", { name: "מצב כהה" })).toHaveAttribute("aria-checked", "true");
  });

  test("and in the drawer", async () => {
    renderHeader("student");
    const paper = await openDrawer();
    expect(within(paper).getByRole("switch", { name: "מצב כהה" })).toBeInTheDocument();
  });
});

describe("the drawer", () => {
  // Decision 3: the drawer and the avatar menu are one list. Every place the
  // menu offers is in the drawer, and the drawer adds the five primary links.
  test("offers everything the avatar menu does, plus the five primary links", async () => {
    const user = userEvent.setup();
    renderHeader("admin");
    const fromMenu = new Set(menuHrefs(await openAvatarMenu(user)));
    await user.keyboard("{Escape}");

    const fromDrawer = new Set(drawerHrefs(await openDrawer(user)));
    for (const href of fromMenu) expect(fromDrawer, href).toContain(href);
    for (const to of ["/archive", "/ask", "/my-courses", "/sessions", "/donate"]) expect(fromDrawer).toContain(to);
    expect(within(document.querySelector(".MuiDrawer-paper")).getByRole("button", { name: "העלאת מדיה" })).toBeInTheDocument();
  });

  // D-05: from the side a line starts on — the right in Hebrew.
  test("opens from the start side, full height, as a modal panel", async () => {
    renderHeader("student");
    const paper = await openDrawer();
    expect(paper.className).toMatch(/MuiDrawer-paperAnchorRight/);
    expect(document.querySelector(".MuiBackdrop-root")).not.toBeNull();
  });

  test("choosing a place closes it and goes there", async () => {
    const user = userEvent.setup();
    renderHeader("student");
    const paper = await openDrawer(user);
    await user.click(within(paper).getByRole("link", { name: "תרומה" }));
    expect(screen.getByTestId("where").textContent).toBe("/donate");
    expect(screen.getByRole("button", { name: "פתיחת תפריט אישי" })).toHaveAttribute("aria-expanded", "false");
  });

  test("the language is a row that opens the list of languages", async () => {
    const user = userEvent.setup();
    renderHeader("student");
    const paper = await openDrawer(user);
    await user.click(within(paper).getByRole("button", { name: /שפת האתר/ }));
    expect(screen.getByRole("menuitem", { name: "English" })).toBeInTheDocument();
  });
});

describe("waiting role requests (D-08)", () => {
  test("show on the avatar button's name and on the users item", async () => {
    const { notificationsApi } = await import("../../../api/notificationsApi");
    notificationsApi.list.mockResolvedValueOnce({ items: [], unread: 0, pendingRoleRequests: 3 });
    renderHeader("admin");
    const button = await screen.findByRole("button", { name: "תפריט החשבון, 3 בקשות ממתינות" });
    await userEvent.click(button);
    expect(within(screen.getByRole("menu")).getByLabelText("משתמשים, 3 בקשות ממתינות")).toBeInTheDocument();
  });
});
