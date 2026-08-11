// @vitest-environment jsdom
import { test, expect, describe } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import authReducer from "../../../store/slicesAndThunks/authSlices/authSlice";
import { buildTheme } from "../../../theme/theme";
import Navbar from "./Navbar";

// What the navigation offers is decided by the signed-in user's role, and the
// three link sets are built by extending one another — student ⊂ lecturer ⊂
// admin. That nesting is convenient and it is also how an admin-only entry
// reaches everybody: add it to the wrong array and nothing fails, the link just
// quietly appears for students who will get a 403 when they follow it.
//
// This is a nav bar, not an access control: the server decides, and ProtectedRoute
// redirects. Showing a student a link to /admin is a bug about honesty rather
// than about security — but it is exactly the kind nobody notices, because you
// have to be logged in as a student to see it.

// A fresh store per render, rather than the app's singleton, so one test cannot
// leave a user signed in for the next.
const storeWithRole = (role) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (role) {
    store.dispatch({
      type: "auth/login/fulfilled",
      payload: { user: { id: 1, display_name: "דוד", role } },
    });
  }
  return store;
};

// Navbar reads the colour mode off a context that App provides. Its default is
// enough here — the toggle is not what is under test.
// The `future` flags only silence v7 upgrade warnings. They are here so a real
// warning is visible when one appears, rather than being the third line of a
// block everyone has learned to scroll past.
// The app's own theme, not MUI's default: some of what is asserted below is
// decided there — the dropdown does not lock the page's scroll because the theme
// says no Popover does.
const renderNavbar = (role) =>
  render(
    <Provider store={storeWithRole(role)}>
      <ThemeProvider theme={buildTheme("light")}>
        <MemoryRouter
          initialEntries={["/archive"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Navbar />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

// Only the links in the top bar; the drawer renders a second copy of several of
// them, and counting both would say nothing about either.
const topBarLinks = () => {
  const bar = screen.getByRole("banner");
  return within(bar).getAllByRole("link").map((a) => a.getAttribute("href"));
};

describe("what each role is offered", () => {
  test("a student gets the shared entries and nothing privileged", () => {
    renderNavbar("student");
    const hrefs = topBarLinks();

    expect(hrefs).toEqual(expect.arrayContaining(["/archive", "/sessions", "/donate"]));
    expect(hrefs).not.toContain("/courses");
    expect(hrefs).not.toContain("/users");
    expect(hrefs).not.toContain("/admin");
  });

  // Lecturers run their own courses. Uploading is a button on the archive page
  // itself, so it deliberately has no nav entry — asserted so that "there is no
  // upload link" stays a decision rather than an oversight.
  test("a lecturer adds courses, and only courses", () => {
    renderNavbar("lecturer");
    const hrefs = topBarLinks();

    expect(hrefs).toContain("/courses");
    expect(hrefs).not.toContain("/users");
    expect(hrefs).not.toContain("/admin");
    expect(hrefs).not.toContain("/upload");
  });

  test("an admin gets everything", () => {
    renderNavbar("admin");
    const hrefs = topBarLinks();

    for (const to of ["/archive", "/sessions", "/donate", "/courses", "/users", "/admin"]) {
      expect(hrefs, `admin should reach ${to}`).toContain(to);
    }
  });

  // The role comes off the user in the store, and an unknown or missing one must
  // fall to the LEAST privileged set rather than to whatever the last branch
  // happens to return.
  test("an unrecognised role is treated as a student, not as an admin", () => {
    renderNavbar("something-new");
    const hrefs = topBarLinks();

    expect(hrefs).toContain("/archive");
    expect(hrefs).not.toContain("/admin");
    expect(hrefs).not.toContain("/users");
  });
});

// The three personal shelves left the bar for one dropdown. They are reachable
// for every role, including the least privileged — the whole point of moving
// them was to declutter, not to hide them from students.
describe("the personal-content dropdown", () => {
  const openPersonal = async () => {
    await userEvent.click(screen.getByRole("button", { name: /תוכן אישי/ }));
    return screen.getByRole("menu");
  };

  test("holds the three personal shelves and nothing else", async () => {
    renderNavbar("student");
    const menu = await openPersonal();

    expect(within(menu).getAllByRole("menuitem").map((i) => i.getAttribute("href")))
      .toEqual(["/notebook", "/likes", "/saved"]);
  });

  // A menu is not a dialog. MUI locks body scroll for anything modal, and with
  // this panel open the page could not be scrolled at all — the wheel did
  // nothing, which reads as the site having hung rather than as a menu waiting
  // for a choice. The lock is off for every Popover in the app (see theme.js),
  // and this is where it is checked, because the failure leaves the markup and
  // the links exactly as they are now.
  test("leaves the page scrollable while it is open", async () => {
    renderNavbar("student");
    await openPersonal();

    expect(document.body.style.overflow).not.toBe("hidden");
  });

  // They must not ALSO be flat tabs: that is exactly the crowding the dropdown
  // replaced, and a duplicate would come back unnoticed the next time the link
  // arrays are edited.
  test("their tabs are gone from the bar itself", () => {
    renderNavbar("admin");
    const hrefs = topBarLinks();

    expect(hrefs).not.toContain("/notebook");
    expect(hrefs).not.toContain("/likes");
    expect(hrefs).not.toContain("/saved");
  });

  // The panel is meant to read as the bar carrying on downwards, and it is drawn
  // from the same barSurfaceSx the AppBar uses. Asserted as "the same as the
  // bar" rather than against a hard-coded gradient, so restyling the bar keeps
  // this passing — which is the whole reason the value is shared.
  //
  // Worth a test because the failure is silent to every other one: an ordinary
  // CSS shorthand written after the gradient erases it, the panel renders plain
  // white, and nothing about the markup or the links changes. That is exactly
  // how it broke the first time.
  test("the panel is painted with the bar's own surface, not a white paper", async () => {
    renderNavbar("student");
    const barSurface = getComputedStyle(screen.getByRole("banner")).backgroundImage;

    await openPersonal();
    const paper = screen.getByRole("menu").closest(".MuiPaper-root");
    const paperStyle = getComputedStyle(paper);

    expect(barSurface).toContain("linear-gradient");
    expect(paperStyle.backgroundImage).toBe(barSurface);
    // MUI's own paper colour must not be showing through underneath it.
    expect(paperStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  // The shelves are meant to open as a second line of the bar — tabs side by
  // side — not as a stacked list. A MenuList stacks by default, so this is one
  // declaration away from silently reverting, and nothing else here would
  // notice: the same three links would still be present and still work.
  test("the shelves open as a row of tabs, not a stacked list", async () => {
    renderNavbar("student");
    await openPersonal();

    const listStyle = getComputedStyle(screen.getByRole("menu"));
    expect(listStyle.display).toBe("flex");
    expect(listStyle.flexDirection).toBe("row");

    // Each tab is as wide as its own label. Without this a MenuItem behaves as
    // the full-width row it was built to be, and the labels wrap.
    const itemStyle = getComputedStyle(screen.getAllByRole("menuitem")[0]);
    expect(itemStyle.whiteSpace).toBe("nowrap");
    expect(itemStyle.flexGrow).toBe("0");
  });

  // Same thickness as the bar, or the strip reads as a thinner thing stuck
  // underneath rather than as the bar continuing. Both come from BAR_HEIGHT, and
  // this compares them to each other rather than to 64 so the pair stays tied
  // together if the bar is ever made taller.
  test("its tabs are as thick as the bar's own", async () => {
    renderNavbar("student");
    const toolbar = screen.getByRole("banner").querySelector(".MuiToolbar-root");
    const barHeight = getComputedStyle(toolbar).minHeight;

    await openPersonal();
    const itemStyle = getComputedStyle(screen.getAllByRole("menuitem")[0]);

    expect(barHeight).toBe("64px");
    expect(itemStyle.height).toBe(barHeight);
  });
});

test("the privileged entries are strictly additive, never a different set", () => {
  renderNavbar("student");
  const studentBar = topBarLinks();

  renderNavbar("admin");
  // Both navbars are mounted now — cleanup runs between tests, not within one —
  // so read the second explicitly rather than letting getByRole find two.
  const bars = screen.getAllByRole("banner");
  const admin = within(bars[bars.length - 1]).getAllByRole("link").map((a) => a.getAttribute("href"));

  // Every student entry survives for an admin. The sets are built by spreading
  // one into the next, and this is the property that spread is chosen FOR — a
  // future refactor to explicit per-role arrays would be free to break it.
  for (const href of studentBar) {
    expect(admin, `admin lost the student entry ${href}`).toContain(href);
  }
});
