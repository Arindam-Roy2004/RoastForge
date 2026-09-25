"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { TbMenu2, TbMoonFilled, TbSunFilled, TbX } from "react-icons/tb";
import FlameIcon from "@/components/icons/flame-icon";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/store/theme";
import { cn } from "@/lib/utils";

/**
 * Navbar in the Notus layout: wordmark and page links together on the left,
 * account actions on the right, and a floating glass pill that drops in from
 * above once you scroll.
 *
 * ## The scroll behaviour is two bars, not one morphing bar
 *
 * This mirrors the reference exactly. There is a resting bar in the document
 * flow that simply scrolls away with the page, and a *separate* fixed pill that
 * animates in from `translateY(-100%)` once you pass the threshold. A single bar
 * that morphs while pinned looks similar in screenshots but feels different in
 * use: the reference's pill arrives as a distinct object, and the resting bar
 * genuinely leaves.
 *
 * Rendering the links twice would normally mean two `<nav>` landmarks and every
 * link announced twice. The resting bar is therefore marked `inert` +
 * `aria-hidden` while the pill is up. It has scrolled out of view by then, so
 * nothing is lost visually, and exactly one navigation is ever exposed to
 * assistive tech or the tab order.
 */

/**
 * Nav link. Sentence case, muted until hover, and colour-only on hover — the
 * reference has no hover background, which is why its links can sit on a bare
 * `gap-10` with nothing boxing them in.
 *
 * No horizontal padding, so the gap between links *is* the visual gap and
 * matches the reference's spacing exactly. `py-2` stays for a usable pointer
 * target (~36px tall), which the reference doesn't bother with.
 */
const NAV_LINK =
  "py-2 text-sm font-medium transition-colors duration-200 hover:text-foreground";

/** The reference's link spacing: `gap-10` at wide widths. */
const NAV_LINK_GAP = "gap-8 lg:gap-10";

/**
 * The navbar's own button shapes.
 *
 * Intentionally not the shared `ui/button`: that component is built for the
 * product surface (`label-mono`, uppercase, 11px) and beside the navbar's
 * sentence-case 14px links it read as a different design. These take the
 * reference's chrome — `rounded-xl`, `text-sm font-medium`, a press with no
 * hover lift — while keeping RoastForge's palette, and they are scoped to this
 * file so no other button in the app changes.
 */
/**
 * `rounded-lg` (8px), not `rounded-xl`, so these nest correctly inside the
 * floating pill. Concentric rounded rectangles only look right when the inner
 * radius equals the outer radius minus the gap between them: the pill is
 * `rounded-2xl` (16px) with `py-2` (8px) of padding, so 16 − 8 = 8px. At 12px
 * the buttons read as too round for the space they sit in.
 *
 * `border-border` is the app's own button edge — the same charcoal ink the
 * gallery's "View Roast" and pagination buttons carry — so the navbar's buttons
 * belong to the same family rather than looking like flat chips.
 */
const NAV_BTN_BASE =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-medium transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45";
const NAV_BTN_PRIMARY = cn(
  NAV_BTN_BASE,
  "border-border bg-primary text-primary-foreground hover:bg-primary/90",
);
const NAV_BTN_OUTLINE = cn(
  NAV_BTN_BASE,
  "border-border bg-background text-foreground hover:bg-muted",
);
// Login stays edgeless so Register carries the emphasis on its own.
const NAV_BTN_QUIET = cn(
  NAV_BTN_BASE,
  "border-transparent text-muted-foreground hover:text-foreground",
);

/** Scroll distance before the floating pill drops in. */
const CONDENSE_AT = 40;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/**
 * Whether the page is scrolled far enough to show the pill.
 *
 * `useSyncExternalStore` rather than a scroll listener writing state in an
 * effect. Scroll position is external state, and reading it through a store
 * gets two things an effect cannot: the value is right on the first client
 * render (refreshing halfway down a page doesn't flash the wrong bar for a
 * frame), and there is no cascading render on mount. `getServerSnapshot`
 * reports "not scrolled" because the server has no scroll position; React
 * reconciles the difference after hydration, which is the supported path.
 */
function useScrolledPast(): boolean {
  return useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > CONDENSE_AT,
    () => false,
  );
}

type NavItem = { href: string; label: string; testId: string };

function useNavItems(): NavItem[] {
  const { user } = useAuth();
  const isRecruiter = user?.role === "recruiter";

  // Anchored at the gallery rather than "/" so it also does something when
  // you're already on the home page.
  const items: NavItem[] = [{ href: "/#hall-of-shame", label: "Browse", testId: "link-browse" }];

  if (user) {
    if (!isRecruiter) {
      items.push({ href: "/upload", label: "Upload", testId: "link-upload" });
      items.push({ href: "/projects", label: "Projects", testId: "link-projects" });
    }
    items.push({ href: "/profile", label: "Profile", testId: "link-profile" });
    if (isRecruiter) {
      items.push({ href: "/recruiter", label: "Dashboard", testId: "link-recruiter" });
    }
  }

  return items;
}

/**
 * Sun and moon are stacked in one box and cross-faded by scale + rotation, so
 * it reads as a single body rotating out of frame rather than two icons
 * swapping. Both stay mounted — rendering on `theme` would leave nothing to
 * animate and would mismatch during hydration.
 */
function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"
      }
      aria-pressed={mounted ? isDark : undefined}
      suppressHydrationWarning
      data-testid="button-theme-toggle"
      className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
    >
      <TbSunFilled
        aria-hidden
        className="size-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
      />
      <TbMoonFilled
        aria-hidden
        className="absolute size-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
      />
    </button>
  );
}

/**
 * Right-hand actions. The reference puts exactly one solid CTA here, so the
 * signed-out state demotes Login to a quiet text button and lets Register carry
 * the emphasis — two equally weighted buttons made this corner look cluttered.
 */
function AccountActions({
  onNavigate,
  stretch = false,
}: {
  onNavigate?: () => void;
  /** Fill the width, for the mobile sheet. */
  stretch?: boolean;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const grow = stretch ? "flex-1" : "";

  if (user) {
    return (
      <button
        type="button"
        onClick={async () => {
          onNavigate?.();
          try {
            await logout();
          } catch {}
          router.push("/login");
        }}
        data-testid="button-logout"
        className={cn(NAV_BTN_OUTLINE, grow)}
      >
        Logout
      </button>
    );
  }

  return (
    <>
      <Link
        href="/login"
        onClick={onNavigate}
        data-testid="link-login"
        className={cn(NAV_BTN_QUIET, grow)}
      >
        Login
      </Link>
      <Link
        href="/register"
        onClick={onNavigate}
        data-testid="link-register"
        className={cn(NAV_BTN_PRIMARY, grow)}
      >
        Register
      </Link>
    </>
  );
}

/**
 * One bar's worth of content, shared by the resting bar and the floating pill
 * so the two can't drift apart.
 *
 * `suffix` distinguishes the duplicated `data-testid`s between the two copies,
 * so a selector can target a specific bar instead of matching two nodes.
 */
function NavRow({
  items,
  isActive,
  suffix,
  onToggleMenu,
  menuOpen,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  suffix: string;
  onToggleMenu: () => void;
  menuOpen: boolean;
}) {
  /**
   * Where the links sit depends on how many there are.
   *
   * Signed in there are four (Browse / Upload / Projects / Profile), which is
   * the reference's own shape — four links centred between the wordmark and the
   * actions. Signed out there is only Browse, and a single link alone in the
   * middle of a wide bar reads as a mistake rather than a menu, so it tucks in
   * beside the wordmark instead.
   */
  const centred = items.length > 1;

  const wordmark = (
    <Link href="/" className="flex shrink-0 items-center gap-2" data-testid={`link-home${suffix}`}>
      <FlameIcon size={20} className="shrink-0 text-primary-strong" strokeWidth={2.25} aria-hidden />
      <span className="text-lg leading-none font-medium tracking-tight text-foreground sm:text-xl">
        RoastForge
      </span>
    </Link>
  );

  const links = (
    <nav
      aria-label="Main navigation"
      className={cn("hidden items-center md:flex", NAV_LINK_GAP)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-testid={`${item.testId}${suffix}`}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            NAV_LINK,
            isActive(item.href) ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle />
      <div className="hidden items-center gap-2 md:flex">
        <AccountActions />
      </div>

      <button
        type="button"
        onClick={onToggleMenu}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
        data-testid={`button-menu-toggle${suffix}`}
        className="nav-glass flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 md:hidden"
      >
        {menuOpen ? (
          <TbX aria-hidden className="size-[18px] shrink-0" />
        ) : (
          <TbMenu2 aria-hidden className="size-[18px] shrink-0" />
        )}
      </button>
    </div>
  );

  // Centred: a `[1fr_auto_1fr]` grid, not flex `justify-between`. The reference
  // gets away with flex because its wordmark and its single CTA happen to be
  // about the same width; ours differ, and the right side changes width between
  // auth states, so flex would park the links off-centre. Equal side columns
  // centre the middle one geometrically instead.
  if (centred) {
    return (
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex min-w-0 items-center justify-self-start">{wordmark}</div>
        <div className="justify-self-center">{links}</div>
        <div className="flex items-center justify-self-end">{actions}</div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-6 sm:gap-8">
        {wordmark}
        {links}
      </div>
      {actions}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const items = useNavItems();
  const scrolled = useScrolledPast();

  // The sheet closes by being *derived* rather than reset in an effect: it
  // remembers the route it was opened on, so once the route differs it is closed
  // by definition. A navigation can't leave it covering the new page, and there
  // is no render-then-correct on route change.
  const [menu, setMenu] = useState({ open: false, path: pathname });
  const menuOpen = menu.open && menu.path === pathname;

  const closeMenu = useCallback(() => setMenu({ open: false, path: pathname }), [pathname]);
  const toggleMenu = useCallback(
    () => setMenu((prev) => ({ open: !(prev.open && prev.path === pathname), path: pathname })),
    [pathname],
  );

  const isActive = (href: string) =>
    href.startsWith("/#") ? false : pathname === href || pathname.startsWith(`${href}/`);

  const rowProps = { items, isActive, onToggleMenu: toggleMenu, menuOpen };

  return (
    <>
      {/* Resting bar. In the document flow, so it reserves its own height and
          scrolls away with the page — no spacer needed anywhere.

          `inert` while the pill is up: by then this has scrolled out of view,
          and it keeps the duplicated links out of the tab order and the
          accessibility tree so only one navigation is ever exposed. */}
      <header
        className="hairline w-full border-b"
        inert={scrolled}
        aria-hidden={scrolled || undefined}
      >
        {/* Layout lives in NavRow, which switches between centred and left-aligned
            depending on the link count — so this is just the width cap. */}
        <div className="mx-auto flex w-full max-w-7xl px-4 py-3">
          <NavRow {...rowProps} suffix="" />
        </div>
      </header>

      {/* Floating pill: a plain 100px slide (no fade), `backdrop-blur-sm`, and
          rounded + inset only from xl — below that it spans full width, where an
          inset pill would leave awkward slivers of page either side.

          `xl:top-3` is the fix for the pill looking sheared off at the top. At
          `top-0` the rounded corners sit flush against the viewport edge, so the
          upper curve has nothing to curve *against* and the bar reads as though
          its top half were cropped. A 12px offset lets the whole rounded
          rectangle be seen, which is what makes it look like a detached object.
          It stays flush below xl, where the bar is square and full-bleed and a
          gap would just look like a misalignment.

          The travel is a fixed 100px rather than -100%: the pill is only ~52px
          tall, so a percentage would start it partly on screen and the entry
          would read as a nudge instead of a drop. */}
      <AnimatePresence>
        {scrolled && (
          <motion.div
            key="floating-nav"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="nav-glass fixed inset-x-0 top-0 z-50 mx-auto flex w-full max-w-[calc(80rem-4rem)] bg-background/80 px-4 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70 xl:top-3 xl:rounded-2xl"
          >
            <NavRow {...rowProps} suffix="-floating" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sheet. Fixed so it works from either bar. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="nav-glass fixed inset-x-4 top-16 z-50 rounded-2xl bg-background/95 p-2 backdrop-blur-md md:hidden"
          >
            <nav aria-label="Main navigation (mobile)" className="flex flex-col">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  data-testid={`${item.testId}-mobile`}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                    isActive(item.href) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="hairline mt-2 flex items-center gap-2 border-t px-1 pt-3 pb-1">
              <AccountActions onNavigate={closeMenu} stretch />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
