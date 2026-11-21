# Redesign v4 – יומן

רשומה לכל שלב: מה השתנה, קבצים, בדיקות, ומה נשאר פתוח.

---

## שלב 0 – מיפוי ותכנון (2026-11-19, opus)

**לא נכתב קוד אפליקציה.**

### מה הופק
- `design/REDESIGN_V4_MAP.md` – מסך ← route ← קבצים (31 מסכים + 7 דפים בלי מוקאפ), מצב קיים (theme, RTL, dark mode, header/מגירה/תמונות, כרטיס מדיה והרשאות, טאבים, נגן, שם האתר, פונטים), 30 רכיבים משותפים עם נתיב מוצע, פעולות שאינן במוקאפים ולאן הן עוברות, ולכל שלב: קבצים + בדיקות unit/e2e שצפויות להישבר.
- `design/REDESIGN_V4_DECISIONS.md` – רשומות D-01 עד D-48 (מסומנות `לסקירה`; חלק מהמספרים מקובצים לפי ההחלטה שהם שייכים לה).
- `design/redesign-v4/_tokens.css` ו-`design/redesign-v4/_coverart.js` – מקומיים בלבד (gitignored). אומת שבלוק ה-`<style>` וה-`tailwind.config` זהים בכל 31 המוקאפים (אותו hash).
- לא נפתח אף `old-*.png` או `new-*.png`: זהות כל מסך ברורה מה-HTML ומהקוד.

### ממצאים שמשנים את התוכנית
1. **אין נגן נייטיב בעמוד הפריט** – יש נגן מותאם (ReactPlayer + `PlayerControls`) באמצע stage של 16:9. שלב 4א בונה layout של כרטיס לאותו רכיב ושומר עוצמה, כתוביות ומהירות (D-21). `MediaPlayer.test.jsx` נכתב מחדש בחלקו.
2. **החלפת שם האתר תשבור את `npm run verify`**: `scripts/check-locale-chunks.mjs` מזהה כל שפה לפי `common:appName`. שלב 2 משנה את המזהה באותו commit (D-26).
3. **באג קיים:** בדפים האישיים מנהל רואה כפתורי פרסום ומחיקה שזורקים שגיאה (חסר handler). תפריט ⋯ יציג רק פעולות עם handler (D-14).
4. **צד המגירה מתהפך** (מהסוף להתחלה) ו**ההמבורגר נעלם מעל md** – `e2e/language.spec.js` מתעדכן בשלב 2 (D-04, D-05).
5. **תצוגת מנהל** כוללת גם מרצים (`isPrivileged`), ומסתירה רק מה שמסומן `admin-only` במוקאפים (D-07).
6. **שדות טופס דרך ה-theme**, לא החלפה גורפת ב-`AppTextField` (D-28) – שומר על `getByLabel` ב-e2e.

### המלצות לתוכנית השלבים
- **לפצל את 4א:** (4א) layout, `LessonHeader`, כרטיס נגן, שורת פעולות, כרטיס מחברת, `CourseTrackBar` – opus; (4ג) תוכן הטאבים: סיכום, פרקים, תמלול, הערות, דיון AI ו-`ChatPane` – sonnet מספיק, כי הדפוסים כבר קבועים. כרגע 4א נוגע בכ-20 רכיבים ובכ-20 קובצי בדיקה.
- **`ChatPane` משותף לטאב הדיון (4א/4ג) ול-09 (5ב).** מי שמגיע ראשון מעצב אותו, והשני רק משתמש בו.
- **05 (מחברת) הוא המסך המסוכן ב-5ב** (גובה מלא, גלילה פנימית, חלון צף, עורך עשיר, 6 קובצי בדיקה). מומלץ להוציא אותו לשלב משנה משלו, או להריץ את 5ב על opus.
- **שלב 2 גדל:** כולל את שם המותג + הסקריפט, `PageContainer` + טבלת רוחבים, `HEADER_HEIGHT` בעשרה דפים, ותיקון ה-e2e של השפה. נשאר opus.

### שאלות פתוחות (לאינון)
- **שם המותג בשרת:** מיילים, דף השיתוף וה-`.ics` עדיין יגידו "פלטפורמת הקהילה" (`community-platform-server/locales/*.json` → `appName`). לשנות שם בריפו השרת?
- **תעתיק לטיני:** "Kol Tevuna" לאנגלית, צרפתית וספרדית – לאשר.
- **פעולות ניהול בדפים האישיים** (מחיקה, פרסום, עריכה ותגיות מתוך "התוכן שאהבתי" ו"תוכן שמור") – לחבר כ-follow-up? (D-14)
- **היקף "תצוגת מנהל"** – רק מה שמסומן `admin-only`, או "תצוגת תלמיד" מלאה? (D-07)
- `public/images/{audio,book,download,video}_image.png` – יתומים כבר היום. שלב 2 ימחק אותם יחד עם `central_image.png` ו-`entry_image.png`, אלא אם תגיד אחרת.

### בדיקות
לא רלוונטי (רק מסמכים). `npm run verify` לא הורץ – לא השתנה קוד.

---

## שלב 1 – theme, טוקנים, פונטים ורכיבי בסיס (2026-11-19, opus)

### מה השתנה
- **טוקנים:** `src/theme/tokens.js` (חדש) – צבעים בהיר/כהה (חלק ב׳ + D-61), `badgeTones`, `RADIUS`, `SHADOW`, `MOTION`, `FONT_TEXT`/`FONT_DISPLAY`, `CONTENT_WIDTH`. המקום היחיד שבו כתובים הערכים.
- **theme:** `src/theme/theme.js` – `buildTheme(mode, direction)` באותה חתימה ומחובר ל-`ColorModeContext` הקיים (בלי שינוי ב-`App.jsx`). palette (primary accent, secondary brand-500 – D-49, `personal` נשמר – D-25, success/warning/error, `surface.*`, `badge.*`), 25 צללים, `theme.tokens`, טיפוגרפיה (`display`, `kicker` – D-62). Overrides: CssBaseline (רקע, טבעת focus, `prefers-reduced-motion` גלובלי – D-48, scrollbars כמו קודם), ButtonBase (בלי ripple, focus-visible – D-54), Button (pill, small/large, `soft`/`dark`/`tinted-success`, outlined נייטרלי – D-56; ה-margins הלוגיים של האייקון נשמרו), IconButton, Link, Tabs/Tab (D-55), Switch iOS לפי כיוון, Chip (D-57), Paper/Card/CardContent/Accordion/Dialog/Alert (D-51), Popover/Menu/MenuItem/Autocomplete (`disableScrollLock` נשמר), Tooltip, InputLabel/InputBase/OutlinedInput/Select/InputAdornment (D-28, D-53).
- **פונטים:** `@fontsource/assistant`, `@fontsource/heebo` ב-dependencies; `src/theme/fonts.js` מיובא ב-`main.jsx` (D-52 – כיסוי נבדק).
- **רכיבי בסיס** (כל אחד עם בדיקת vitest): `features/AppTextField`, `features/SegmentedControl` (+`segmentedKeys.js`, D-58), `features/StatusBadge`, `features/SectionCard`, `features/PageHeader` (`size: page|archive`, `align: start|center`), `features/EmptyState`, `features/BackLink`. `features/SearchBar` עוצב מחדש = SearchField (D-59, בדיקה חדשה). `features/NoDataDialog` עטיפה של `EmptyState` (D-60).
- `AuthLayout.jsx`: הוסר `fontFamily: system-ui` (מקבל את הפונט מה-theme). `ErrorBoundary` נשאר עם system-ui – הוא מחוץ ל-ThemeProvider בכוונה.
- `eslint.config.js`: `design/**` ב-ignores (D-63).
- **אין מחרוזות UI חדשות** – רכיבי הבסיס מקבלים את הטקסט מהקורא, ולכן לא הופעל `add-translation`. **אין סקריפט חדש ב-`package.json`** – אין סקיל לעדכן.

### קבצים
`package.json`, `package-lock.json`, `eslint.config.js`, `src/main.jsx`, `src/theme/{theme,tokens,fonts}.js`, `src/theme/theme.test.js`, `src/components/features/{AppTextField,SegmentedControl,StatusBadge,SectionCard,PageHeader,EmptyState,BackLink}/*`, `src/components/features/SearchBar/{SearchBar.jsx,SearchBar.test.jsx}`, `src/components/features/NoDataDialog/NoDataDialog.jsx`, `src/components/pages/auth/AuthLayout.jsx`, `design/REDESIGN_V4_{DECISIONS,LOG}.md`.

### בדיקות
- `npm run verify` ירוק (lint – אזהרה ישנה אחת ב-`useAdminDashboardController.js`; 162 קובצי בדיקה, 1823 בדיקות; build; check:chunks).
- שום בדיקה קיימת לא נשברה, ולכן לא עודכנה אף אחת.
- הערה לשלבים הבאים: jsdom מכריע בין כללי CSS לפי סדר ולא לפי specificity, כך ש-`getComputedStyle` בבדיקה לא מוכיח מה ייראה בדפדפן כשיש כמה כללים מתחרים. הבדיקות כאן בודקות סגנון רק כשיש כלל אחד.
- e2e לא הורץ: לא זזה לוגיקה (ניווט, נגן, ⋯). ה-label של השדות נשאר מקושר (`getByLabel`), ו-`SegmentedControl` עדיין לא מחליף אף רכיב.

### מה נשאר פתוח
- לא נבדק בדפדפן אמיתי (אין צילום בשלב הזה). הסיכון העיקרי: שדות עם label בתוך toolbars צפופים גבוהים יותר עכשיו (label מעל), ו-`<Paper>` רגילים בדפים קיבלו רדיוס 24 וגבול – מכוון (D-51), ויתוקן דף-דף בשלבים.
- `FilterBar` דורס את עיצוב ה-SearchBar וה-Select ב-`sx` משלו – 3א.
- דפי ה-auth: שדות `standard` עם label קטן קבוע מעל (D-53) עד 5א.

---

## שלב 2 – מעטפת (2026-11-19, opus)

### מה השתנה
- **`navConfig` אחד** (`layout/navConfig.js`, D-64): 5 קישורים ראשיים, 3 פריטי dock, מדפים + "החשבון שלי", פריטי ניהול לפי תפקיד, `isActive` (D-31). `navLinks.js` נמחק.
- **`AppHeader`** (`layout/navbar/AppHeader.jsx`): sticky, 48px, זכוכית, 1180 פנימי; לוגו + שם + 5 קישורים (מ-md), פעמון (נקודה, D-71) ואווטאר עם chevron. מתחת ל-md: המבורגר. `variant="minimal"` (לוגו, שם, גלובוס) – מוצג מ-`AuthLayout` ולכל מי שלא מחובר (D-11, D-70). הלוגיקה ב-`useAppShell.js`.
- **`AvatarMenu`** (272, מ-navConfig, בסדר של קומפוננטה 2): כותרת → החשבון שלי, מדפים, החשבון שלי, מתג "תצוגת מנהל" + קבוצת ניהול (עם ה-pill של בקשות התפקיד), שפת האתר (פותח את `LanguageMenu`, שיוצא עכשיו מ-`LanguageSwitcher.jsx` עם `onChosen`), התקנה, מתג "מצב כהה", התנתקות.
- **`NavDrawer`** (מסך 19): modal מצד ההתחלה, 400px, backdrop + blur, אווטאר 80 עם gradient, badge תפקיד, אותן קבוצות + 5 הקישורים. נסגר בניווט ומעצמו מ-md (D-05, D-69).
- **`Dock`**: זכוכית, 3 אייקונים עם gradient (SVG מהמוקאפ ב-`dockIcons.jsx`), הגדלה + tooltip בדסקטופ, תוויות במובייל, נקודה לפעיל; לא מסומן כלום ב-`/courses`. מוצג רק למחובר, לא ב-auth, באורח ובחדר מפגש (D-24, D-76).
- **תצוגת מנהל** (D-66): `adminView.js` + `useAdminView.js` + `AdminOnly.jsx`, provider ב-`App.jsx`. הוחל על קבוצת הניהול ועל כפתור ההעלאה בארכיון.
- **"מצב כהה"** עבר מה-header לתפריט ולמגירה כ-`role="switch"` (D-67).
- **`PageContainer` + `pageWidth.js`**: App עוטף כל route במעטפת – 1180/1080/full, 16/24 בצדדים, 32/48 למעלה, 160 למטה (בלי dock: 32/48). `shellGeometry.js`: `HEADER_HEIGHT = 48`, `DOCK_CLEARANCE`, `DOCK_OFFSET`, `viewportBelowHeader`.
- **64→48:** `SessionRoom`, `NotebookPage` מ-`HEADER_HEIGHT`; ב-8 דפים ה-`minHeight` הוסר (D-72). `GlobalSnackbar` מעל ה-dock (D-75).
- **תמונות:** עמודת התמונה של הארכיון, תמונת הרקע והשטיפות של `AuthLayout` הוסרו; הכרטיס עבר ל-paper (D-73). כל 6 הקבצים ב-`public/images/` נמחקו (אף אחד לא בשימוש).
- **שם המותג** (D-26, D-74): "קול תבונה" (he/yi), "Kol Tevuna" (en/fr/es); `check-locale-chunks.mjs` מזהה לפי `common:language.change` באותו commit; `index.html`, manifest.
- **מחרוזות חדשות** (דרך `add-translation`, 5 שפות, yi טיוטה): `nav:mainNav`, `nav:adminView`, `nav:groups.admin`, `nav:links.upload`, `nav:accountMenu.open`/`openPending_*`, `nav:dock.{label,ask,myCourses}`. נמחקו: `nav:personal`, `nav:colorMode.toLight/toggle` (D-78).
- טוקנים חדשים ב-`tokens.js`: `DOCK`, `SHELL`.
- **נמחקו:** `Navbar.jsx`, `NavLinksBar.jsx`, `PersonalMenu.jsx`, `UserDrawer.jsx`, `navStyles.js`, `navLinks.js`, `Navbar.test.jsx`.

### כל קישור מהניווט הישן – איפה הוא עכשיו
ארכיון, שאל, הקורסים שלי, מפגשים, תרומה → header (md+), מגירה, ו-3 מהם ב-dock · 5 המדפים → תפריט ומגירה · `/profile` → כותרת התפריט + "החשבון שלי" + מגירה · ניהול קורסים / משתמשים / ניהול → קבוצת ניהול (תפריט + מגירה, מאחורי המתג; ב-URL תמיד) · שפה, התקנה, מצב כהה, התנתקות → תפריט ומגירה · פעמון → header בכל רוחב.

### בדיקות
- `npm run verify` ירוק (lint, כל הבדיקות, build, check:chunks).
- חדשות: `AppHeader.test.jsx` (מחליף את `Navbar.test.jsx`: תפקידים, תפריט, מגירה = תפריט + 5, תצוגת מנהל, מצב כהה, העלאה מהתפריט, בקשות תפקיד), `Dock.test.jsx`, `navConfig.test.js`, `pageWidth.test.js`, `adminView.test.jsx`. עודכנו: `NotificationBell.test.jsx`, `accountState.test.jsx` (התנתקות מהתפריט ומהמגירה), `shellKeys.test.js`, `i18n.test.jsx`, `useMediaSession.test.js` (השם החדש).
- **`npm run e2e` ירוק – 5/5** (journey he/en/yi, language, phone). `e2e/language.spec.js` עודכן: השפה נבחרת אחרי התחברות מתפריט האווטאר; המגירה נמדדת ב-viewport של 600px (ההמבורגר רק מתחת ל-md), נסגרת ב-Esc, והצד התהפך (עברית → right, אנגלית → left; D-05).
- ה-e2e תפס באג שהבדיקות לא ראו: `user` שימש ב-`App.jsx` לפני שהוגדר (TDZ – כל הדפים נפלו ל-ErrorBoundary). תוקן. אין בדיקת unit שמרנדרת את `App` כולו.
- צולם בדפדפן (1440 ו-390, עברית): header, תפריט, מגירה, dock, דף התחברות – תואם את 02/19.
- ה-API ו-Vite כבר רצו כשהשלב התחיל (לא הופעלו על ידי השלב), ולכן לא נעצרו בסופו. Memurai רץ.
- **אין סקריפט חדש ב-`package.json`** – אין סקיל לעדכן.

### מה נשאר פתוח
- `admin-only` על badges ו-⋯ – 3א (`MediaTile`); badge בעמוד הפריט – 4א. המנגנון: `useAdminView().showAdmin` או `<AdminOnly>`.
- padding כפול בדפים שלא עוצבו (ה-`p: 3` הישן בתוך `PageContainer`) – כל שלב מוריד בדפים שלו (D-13). המחברת גוללת זמנית (D-72) – 5ב.
- Breakpoint 900 ולא 768 (D-68) – לבדוק ב-8ב.
- אייקוני האפליקציה עדיין navy; שם המותג בשרת (מיילים, דף שיתוף) – שאלה פתוחה משלב 0.

---

## שלב 3א – CoverArt, MediaTile, ⋯ ודף הארכיון (2026-11-19, opus)

### מה השתנה
- **`CoverArt`** (`features/MediaTile/CoverArt.jsx` + `src/utilities/coverArt.js`): 15 הפלטות והצורות של `art()` מהמוקאפ, פלטה לפי FNV-hash של `item.id` (D-19), `thumbnail_url` גובר, id ל-gradient מ-`useId`.
- **`MediaTile`** (קומפוננטה 5) מחליף את `MediaCard` בכל מקום – דרך `MediaGrid`, ולכן גם בדף יוצר, אהבתי, שמורים, רשימה שמורה והמשך צפייה. עטיפה מרובעת, ▶ (ציור, D-02/D-80), ♥ עם pop (רק בלחיצה, מבוטל ב-reduced-motion; D-79), ⋯ (`MediaTileMenu` + `useMediaTileMenu` + `tileActions.js` טהור: הורדה לכולם; עריכה · תגיות · פרסום/הסתרה · מפריד · מחיקה רק עם הרשאה **ו**-`showAdmin` **ו**-handler – D-14/D-15; "הורדה" פותח את `DownloadMenu` – D-16), badge טיוטה/ציבורי admin-only, kicker "סוג · משך", כותרת h3 עד 2 שורות, מרצה (לחיץ לדף יוצר), תגית ראשונה. בלי מונה לייקים ובלי שורת אייקונים. תצוגה מקדימה של וידאו ב-hover נשמרה (`useVideoPreview`).
- **לייק בגריד:** `useTileLikes` – `fetchLikedIds` פעם אחת לגריד, אותם `likeMedia`/`unlikeMedia` (D-18).
- **`MediaGrid`:** 2/3/4 עמודות, רווחים 16/32 × 32/48 (`TILE.gap`), skeleton מרובע, "טעינת עוד" soft. מחושב בו `showAdmin` ו-likes פעם אחת לכל הגריד.
- **דף הארכיון (02)** במבנה של החלטה 1: `PageHeader` (ברכה כ-kicker – D-88, H1 44/80, כותרת משנה, "העלאת מדיה" admin-only) → טאבים → `ArchiveHero` (D-01, D-87; `featuredItem.js` טהור) → `ArchiveToolbar` דביק ב-`top: HEADER_HEIGHT` (צ׳יפי סוג multi-select – D-03, חיפוש, מיון כצ׳יפ עם תפריט – D-84, צ׳יפ "סינון" כהה כשפתוח עם מונה – D-86) → פאנל 29 (`FilterBar` הפך לפאנל בלבד: מרצה, אורך, 2 תאריכים, ניקוי, מפריד, תגיות; בלי בורר סוג) → "כל הפריטים" + ספירה (D-34) → גריד. הכל ב-`ArchiveBrowser`, ולכן גם בדף היוצר.
- **`FilterChip`** חדש ב-`features/` (D-85). `filterCount.js` – הספירה של הצ׳יפ "סינון", בלי הסוג.
- **חיפוש עומק חכם (03):** שדה גדול ממורכז (D-90). `TagDrilldown`: צ׳יפים בגודל מלא, חיפוש תגית כ-pill בתחילת השורה.
- **טוקנים:** `TILE`, `HERO` ב-`tokens.js`.
- **מחרוזות** (דרך `add-translation`, 5 שפות, yi טיוטה): `archive:subtitle`, `allItems`, `hero.{label,kicker,listen,watch,read,details}`, `sort.button`; `media:card.{kicker,actionsFor,likeOf}`; ניסוח חדש ל-`card.publishedHint`/`draftHint` (D-83). נמחקו: `card.editDetailsOf`, `editTagsOf`, `length`, `likes_*` (D-82).
- **נמחקו:** `features/MediaGrid/MediaCard.jsx`, `MediaCard.test.jsx`.
- **סקיל חדש** בריפו השורש: `.claude/skills/redesign-screen/SKILL.md` – הצ׳קליסט להחלת v4 על מסך (רכיבים, טוקנים, admin-only, PageContainer, i18n, lint, בדיקות, DECISIONS/LOG). commit נפרד בריפו השורש (ענף `i18n`).

### קבצים
`src/utilities/coverArt.js` (+test), `src/components/features/MediaTile/{CoverArt,MediaTile,MediaTileMenu}.jsx`, `{useMediaTileMenu,useTileLikes,useVideoPreview,tileActions}.js`, `MediaTile.test.jsx`, `tileActions.test.js`, `features/FilterChip/FilterChip.jsx`, `features/MediaGrid/MediaGrid.jsx`, `features/SmartSearch/SmartSearch.jsx`, `pages/archive/{ArchivePage.jsx,featuredItem.js,featuredItem.test.js}`, `pages/archive/componentsArchive/{ArchiveBrowser,ArchiveGreeting,ArchiveHero,ArchiveToolbar,FilterBar,TagDrilldown}.jsx`, `filterCount.js`, `ArchiveToolbar.test.jsx`, `FilterBar.test.jsx`, `src/theme/tokens.js`, `src/locales/*/{archive,media}.json`, `src/components/a11yReview.test.jsx`, `pages/personal/PlaylistsSection.test.jsx`, `e2e/journey.spec.js`, `design/REDESIGN_V4_{DECISIONS,LOG}.md`.

### בדיקות
- `npm run verify` ירוק – 170 קובצי בדיקה, 1881 בדיקות, build, check:chunks (אזהרת lint ישנה אחת ב-`useAdminDashboardController.js`).
- **חדשות:** `MediaTile.test.jsx` (16: kicker עם/בלי משך, כותרת ותגית אחת, בלי מונה ותיאור, תמונה מול CoverArt, פתיחה בלחיצה וב-Enter, יוצר לחיץ בלבד, לב עם `aria-pressed`, ⋯ לסטודנט/מנהל/תצוגת מנהל כבויה, טיוטה + פרסום, כל פעולה ל-handler, הורדה → `DownloadMenu`), `tileActions.test.js`, `coverArt.test.js`, `featuredItem.test.js`, `ArchiveToolbar.test.jsx`.
- **נכתבו מחדש (מבנה, לא התנהגות):** `MediaCard.test.jsx` → `MediaTile.test.jsx` (אורך ב-kicker במקום chip עם `aria-label`); `FilterBar.test.jsx` – בדיקות הסוג והמיון עברו ל-`ArchiveToolbar.test.jsx` (המיון: `button` + `menuitemradio` במקום `combobox` + `option`), "ספירה על ה-badge" נבדקת על `activeFilterCount` ועל הצ׳יפ; הפאנל נבדק שאין בו בורר סוג. `a11yReview.test.jsx` – ה-mock עבר ל-`MediaTile` + mocks ל-`useTileLikes`/`useAdminView`. `PlaylistsSection.test.jsx` – ה-store של הבדיקה קיבל `likes` (האריח קורא אותו).
- **e2e:** `journey.spec.js` – הפרסום נעשה דרך ⋯ של האריח (`media:card.actionsFor` עם שם השיעור) ואז `menuitem` `media:card.publish`. **`npm run e2e` ירוק – 5/5:** בריצה המלאה 4 עברו (journey en/yi עם הפרסום החדש, language, phone), וה-journey בעברית נפל בצעד הראשון (הרשמה) על "לא ניתן להגיע לשרת" – תקלת API רגעית לפני כל UI של השלב; בהרצה חוזרת (`-g "[he]"`) עבר במלואו, כולל הפרסום דרך ⋯.
- ה-API, Vite ו-Memurai כבר רצו כשהשלב התחיל – לא הופעלו ולא נעצרו על ידו.
- **אין סקריפט חדש ב-`package.json`** – אין סקיל קיים לעדכן.

### מה נשאר פתוח
- **לשלב 3ב:** `CollectionPage`, `PlaylistPage`, `PlaylistsSection`, `CreatorPage` כבר מציגים `MediaTile` (דרך `MediaGrid`), אבל עדיין עם הכותרות, ה-`p: 3` וה-`bgcolor` הישנים. `PlaylistsSection` עדיין סופר "3 בשורה" (`PER_ROW`) מול גריד של 4 ב-lg – יתוקן במבנה המתקפל (D-36). בדפים האישיים ⋯ = הורדה בלבד (D-14), כי לא מועברים handlers.
- הלב באריח מול האגודל בעמוד הפריט (D-79) – להכריע ב-4א.
- לא צולם בדפדפן בשלב הזה מעבר ל-e2e; השוואה ויזואלית מול `new-02`/`new-29` – 8ב.

## שלב 3ב – 03, 04, 06, 07/28, 25

- **מה השתנה:** `CollectionPage` (המשך צפייה, אהבתי, תוכן שמור) ו-`PlaylistPage` – `PageHeader` (kicker עם מונה, כותרת משנה) והסרת עטיפות `p: 3`/`bgcolor`; `PlaylistsSection` – שורות מתקפלות במקום "שלושה בשורה" והחץ "עוד" (D-36, D-92); `CreatorPage` – אווטאר גדול עם gradient, `h1` display, `BackLink` (D-93). מסך 03 כבר נעשה ב-3א (D-90) ולא נגעו בו. D-91..D-93.
- **קבצים:** `pages/personal/{CollectionPage,PlaylistPage,PlaylistsSection,useCollectionPageController}.jsx/js`, `pages/creators/CreatorPage.jsx`, `layout/personalShelves.js` (`subtitleKey`), locales `nav.json` (+`shelfSubtitle`) ו-`personal.json` (−`more`/`noMore`/`showMore`) בחמש שפות.
- **בדיקות:** `PlaylistsSection.test.jsx` נכתבה מחדש (מבנה: שורה מתקפלת במקום חץ ו"שלוש בשורה"; אותה התנהגות – שם, מונה, סדר, ריק, "לרשימה המלאה", שתי רשימות בלתי תלויות). `PlaylistsSectionLoading` ללא שינוי.
- **סקריפטים:** אין שינוי ב-`package.json`.
- **פתוח:** השוואה ויזואלית – 8ב.
- **שער:** lint, build ו-`check:chunks` ירוקים; בריצת `verify` מלאה תחת עומס נפל מבחן אחד של `language` (timeout), שעבר בהרצה בודדת (4/4 קבצים). **`npm run e2e` ירוק – 5/5.**

---

## שלב 4א – עמוד שמע ווידאו: layout, נגן, מיכל הטאבים, שורת פעולות, מחברת (2026-11-19, opus)

### מה השתנה
- **`LessonHeader`** חדש (`pages/mediaView/componentsMediaView/`): `BackLink` "הארכיון" → kicker accent לפי סוג (`lesson:kicker.*`) + badge "טיוטה"/"ציבורי" admin-only (`showStatusBadge` מה-controller = `showsStatusBadge` של האריח + `useAdminView`) → H1 display (שמע 48/64, וידאו/ספר 40/56, בלי נקודה בסוף – `lessonTitle.js`) → "מרצה: X" עם הקישור לדף היוצר (D-96, D-97).
- **`MediaViewPage`**: בלי `p: 3` ובלי MUI Grid; CSS grid של 12 – שמע 5/7 מ-md (CoverArt מרובע + כרטיס נגן | כרטיס טאבים), וידאו וספר 7/5 מ-lg (נגן + תאריך | טאבים). מתחת: מטא (תאריך בשמע), תיאור 17px, כרטיס המחברת. מדידת `panelHeight` (ResizeObserver + `stageHeightForWidth`) יצאה; לתוכן הטאבים `maxHeight: 70vh` מ-md (D-22, D-98).
- **נגן (D-21, D-94):** `PlayerControls` עם `variant` – `"card"` לשמע (play 56 accent, פס 6px `ltr`, זמנים 13px `ltr`, שורת 36px: עוצמה, כתוביות, הגדרות = מהירות + הורדות) ו-`"overlay"` לווידאו (הבר הקיים). `MediaPlayer` לשמע = כרטיס עם ה-`<audio>` המוסתר והכתובית בתוכו; לווידאו stage 16:9 ברדיוס 28 עם `SHADOW.player`. המילוי = accent בשניהם (במקום `mediaTypeAccents`). `seekOnReady`, `onProgress` (שמירת מיקום), `seekTo` דרך ref, `useMediaSession`, `captionsOn` – לא זזו. `stageGeometry.js` + בדיקתו נמחקו.
- **`MediaInsightsTabs`:** רק המיכל – בלי `fullWidth`, ה-theme מצייר וגולל; prop `contentMaxHeight` (D-101). תוכן הפאנלים לא נגע (4ג).
- **`MediaActionsBar` (D-99):** pills `soft` מיושרים להתחלה, אייקון לפני התווית; "לייק" `tinted-success` כשלחוץ; שמירה + caret הרשימות ב-pill אחד. משותף לחלון המקור במחברת.
- **לב (D-95):** `likeIcons` → לב (עמוד הפריט, מדף "התוכן שאהבתי" במגירה; האריח כבר היה לב). סוגר את D-79.
- **`LessonNotebook`, `CourseTrackBar` (D-100):** כרטיסי `Paper` בסגנון החדש; כותרת display 26, כפתורים soft/primary, מונה כ-`StatusBadge`, מצב ריק טקסט 15px.
- **מחרוזות** (דרך `add-translation`, 5 שפות, yi טיוטה): `lesson:backToArchive`, `lesson:kicker.{audio,video,text}`. לא נמחקו מפתחות (כל הקיימים עדיין בשימוש).
- **סקיל:** `redesign-screen` קיבל שורות ל-`LessonHeader` ולשני ה-variants של הנגן (commit נפרד בריפו השורש, ענף `i18n`).

### קבצים
`src/components/pages/mediaView/{MediaViewPage.jsx,MediaViewPage.test.jsx,useMediaViewPageController.js}`, `componentsMediaView/{LessonHeader.jsx,lessonTitle.js,lessonTitle.test.js,MediaInsightsTabs.jsx,MediaActionsBar.jsx,LessonNotebook.jsx,CourseTrackBar.jsx}`, `src/components/features/MediaPlayer/{MediaPlayer.jsx,PlayerControls.jsx,MediaPlayer.test.jsx}` (−`stageGeometry.js`, −`stageGeometry.test.js`), `src/components/layout/personalShelves.js`, `src/locales/*/lesson.json`, `design/REDESIGN_V4_{DECISIONS,LOG}.md`.

### בדיקות
- **נכתבו מחדש (מבנה, לא התנהגות):** `MediaPlayer.test.jsx` – לשמע: "stage 16:9 עם בר ממורכז" → "כרטיס בלי stage", האלמנט 1×1 נמצא לפי `data-testid`, הבר "לא נעלם" → הפקדים לא נעלמים; צבע ההתקדמות → accent בשני הסוגים (במקום כתום/כחול). נוספו: הכרטיס מציע play/מיקום/זמנים/עוצמה/הגדרות, מהירות מתפריט הכרטיס, רדיוס 28 לווידאו. `MediaViewPage.test.jsx` – עטוף ב-`MemoryRouter` (ה-BackLink); נוספו: header (קישור לארכיון, kicker, H1 בלי נקודה, badge רק עם `showStatusBadge`, "ציבורי"), עטיפה רק לשמע. כל 25 הבדיקות הקיימות עברו בלי שינוי (תוויות לייק/שמירה, caret, טאבים, תאריך).
- **חדשה:** `lessonTitle.test.js`. **נמחקה:** `stageGeometry.test.js` (הפונקציה יצאה).
- `SourcePreviewDialogBookmarks`, `LessonNotebook*`, `SaveMenu*`, `ShareDialogActions` – עברו בלי שינוי.

- **`npm run e2e` ירוק – 5/5** בריצה אחת (journey he/en/yi – כולל heading בשם השיעור, `lesson:actions.share` והקישור הציבורי בעמוד החדש; language; phone). ה-e2e לא מנגן מדיה; ניגון, הסתרת הבר בווידאו ו-seek נבדקו ביחידה ובדפדפן.
- נבדק בדפדפן (1510px, עברית, מנהל): שמע (`/media/100`) – עטיפה, כרטיס נגן עם כתובית, טאבים עם גלילה פנימית, שורת פעולות, מטא, מחברת; וידאו (`/media/46`, טיוטה) – badge, נגן ברדיוס 28, ניגון והסתרת הבר, תאריך מתחת לנגן. מובייל לא צולם (חלון הדפדפן לא השתנה בגודל) – העמודות נערמות ב-xs דרך `gridTemplateColumns`.
- ה-API, Vite ו-Memurai כבר רצו כשהשלב התחיל – לא הופעלו ולא נעצרו על ידו. **אין סקריפט חדש ב-`package.json`.**

### מה נשאר פתוח
- **4ג:** תוכן הטאבים (סיכום: נקודות מפתח כרשימה, תגיות מוצעות בקופסת `fill-2`; פרקים; תמלול; הערות; דיון; `ChatPane`). המיכל כבר נותן `maxHeight` וגלילה – לא להוסיף גלילה פנימית נוספת בפאנל.
- **4ב:** ענף `isText` כבר ב-layout של 7/5 מ-lg עם `LessonHeader` (kicker "ספר", H1 40/56) ותאריך 13px מתחת למציג; `TextViewer` עצמו, הקישור "פתיחה בכרטיסייה חדשה" וכפתור "הפקת סיכום מחדש" – 4ב.
- `mediaTypeAccents` עדיין בשימוש במחברת (`RichNoteEditor`, `BookmarksSidebar`) – 5ג.
- השוואה מול `new-20`/`new-26` במובייל – 8ב.

---

## שלב 4ג – תוכן הטאבים: סיכום, פרקים, תמלול, הערות, דיון + ChatPane (2026-11-19, sonnet)

### מה השתנה
- **סיכום (20):** `AISummaryPanel` – H3 display 24, פסקה 16 / 1.9 ב-`ink2`, נקודות מפתח כרשימה עם נקודת accent של 6px (לא chips), כותרות h4 18/800, בלי Divider; `AiTagSuggestions` – קופסת `fill-2` (D-105).
- **פרקים (21):** `ChaptersPanel` (D-106).
- **תמלול (22):** `SegmentedControl` במקום `ToggleButtonGroup` ב-`MediaInsightsTabs`; `FollowAlongTranscript` עם `<mark>` ו-`surface.cue` (D-104); `TranscriptEditor` – כותרת display 24 ופסקאות 16 / 1.9. טוקן `cue` ב-`tokens.js`/`theme.js`.
- **הערות (23):** `NotesPanel` – כותרת display 24, כפתור "שמור" primary בלי אייקון. הרשימה, העריכה, שלושת סוגי העוגנים – ללא שינוי.
- **דיון (24):** `AIDiscussionPanel` עם `SegmentedControl` לשלושת המצבים; `ChatPane` (D-107). `SmartSearchPane` ו-`HistoryPane` לא שונו (כרטיסי Paper קיימים נראים נכון בסגנון החדש).
- לא נוסף מיכל גלילה; לא נוספו או נמחקו מחרוזות.
- החלטות: D-102 עד D-107.

### בדיקות ושער
- בדיקות קיימות עברו בלי שינוי (כפתורי `aria-pressed` נשמרו – D-103). נוספה בדיקה אחת: נקודות מפתח כ-`ul`/`li` (`AISummaryPanel.test.jsx`).
- **`npm run verify` ירוק** – 170 קבצים + הבדיקה החדשה, build, check:chunks.
- **`npm run e2e`:** ריצה ראשונה 4/5 – ה-journey בעברית נפל בהרשמה (נשאר ב-`/sign-up`, לפני מסך שעוצב מחדש); ריצה חוזרת של הספק לבדו – עברה. API ו-Vite כבר רצו, לא הופעלו ולא נעצרו.
- **פתוח:** לא צולם בדפדפן; השוואה מול `new-20..24` ובדיקת dark/מובייל – 8ב. `ChatPane` ב-/ask לא נבדק חזותית (5ב).

---

## שלב 4ב – עמוד ספר (27) (2026-11-19, sonnet)

### מה השתנה
- `PdfViewer`: מיכל `divider` ברדיוס 20 ו-padding 12; `PdfToolbar`: בלי כרטיס, ltr, ממורכז; `PdfPage`: כרטיס לבן, צל `cover`, רדיוס 12 (D-108).
- `TextViewer`: הקישור "פתיחה בכרטיסייה חדשה" 13px accent עם אייקון; iframe ברדיוס 12. `AISummaryPanel`: "הפק מחדש" `soft` (D-109). אין מחרוזות חדשות ואין מפתחות שנמחקו.
- נבדק בקוד: בספר שלוש הלשוניות בלבד (סיכום, הערות, דיון); סימניות דף, הודעת איכות טקסט והרשאת ההפקה – ללא שינוי. החלטות: D-108, D-109.
### קבצים
`componentsMediaView/{PdfViewer,PdfToolbar,PdfPage,TextViewer,AISummaryPanel}.jsx`.
### פתוח
`npm run verify` ירוק; `npm run e2e` 5/5. לא צולם בדפדפן; השוואה מול `new-27`, dark ומובייל – 8ב.

---

## שלב 5א – התחברות, הרשמה, איפוס סיסמה (01, 30, 31) (2026-11-19, sonnet)

### מה השתנה
- `AuthLayout`: רקע שני גרדיאנטים (בהיר וכהה, `AUTH` ב-`tokens.js`), כרטיס 440 ברדיוס 32 עם blur וצל `auth`, לוגו כהה 48, H1 display 40, `intro` אופציונלי. כבר לא כופה theme בהיר (D-110). ה-header המינימלי משלב 2 בשימוש, ואין dock (`App.jsx` כבר לא מציג אותו ב-`AUTH_PATHS`).
- שדות רגילים מה-theme, כפתור מלא, מפריד "או", כפתורי ספקים outline עם ריבוע לוגו (D-111, D-112); הרשמה עם `SegmentedControl` ו-`*` על השדות הנדרשים (D-113); איפוס/אימות/הסרה באותו כרטיס (D-114). אין מחרוזות חדשות ואין מפתחות שנמחקו.
### קבצים
`pages/auth/{AuthLayout,authShared,SocialSignIn,SignIn,SignUp,ForgotPassword,ResetPassword,VerifyEmail,Unsubscribe}.jsx`, `theme/tokens.js` (`AUTH`).
### בדיקות
- `authPagesFlow.test.jsx`: "sign-in/sign-up offers Google, then Apple, then LinkedIn" read each button's `textContent`, which now includes the logo square's "G" / "in". The helper takes the name without `aria-hidden` children; the assertion (three providers, same order, same words) is unchanged. `ResetPassword.test.jsx`, `Unsubscribe.test.jsx` passed untouched.
- `npm run verify`: lint, whole suite (1891), build and `check:chunks` green after that one fix. `npm run e2e`: 5/5 (journey he/en/yi, language, phone).
### על ה-flake
בריצת e2e הראשונה נפלו כל 5, לא בגלל `/sign-up` אלא כי שרת ה-Vite שרץ כבר הגיש את `SocialSignIn.jsx` כמודול ריק (נקרא באמצע כתיבה) – "does not provide an export named 'default'", והדף לא עלה. `touch` על הקבצים תיקן, והריצה השנייה ירוקה. השינוי שלנו לא גרם ל"לא ניתן להגיע לשרת". אם זה חוזר אחרי כתיבת קבצים – קודם `curl` על המודול.
### פתוח
לא צולם בדפדפן; השוואה מול `new-01/30/31`, dark, LTR ומובייל – 8ב. אימות הטלפון (`PhoneCard`) נשאר ל-5ב. D-110 עד D-114 (המספור ממשיך אחרי D-109 שכבר נתפס בשלב 4ב).

---

## שלב 5ב – הורדות, שאל את הארכיון, תרומה, החשבון שלי (08, 09, 12, 18) (2026-11-19, sonnet)

### מה השתנה
- הורדות: `PageHeader` + `EmptyState`, שורות עם רדיוס 16 וכפתור השמעה accent (D-118).
- `/ask`: בלי כרטיס עוטף, `PageHeader` עם "שיחה חדשה"/"העתק שיחה" כ-`soft`, והקלט דביק מעל ה-dock (`ChatPane` קיבל `hideActions` ו-`inputBottom`; D-115).
- תרומה: `PageHeader` ממורכז עם kicker, `SectionCard` 560, `SegmentedControl`, גריד סכומים, מנעול (D-116). נוסף `donate:kicker` בחמש שפות.
- החשבון שלי: כרטיסי `SectionCard`, אווטאר 112 עם גרדיאנט, תגיות `StatusBadge`, שורות התראות, `PhoneCard` ובקשת ההרשאה באותה שפה, סיסמה בשלוש עמודות (D-117). כל ההגדרות הקיימות נשארו. הקבצים: `pages/{downloads,askArchive,donate,profile}/*`, `features/ChatPane/ChatPane.jsx`, `features/Avatar/AvatarEditor.jsx`, `locales/*/donate.json`.
- שלב 5ב בפועל לא כלל את 05 (המחברת) – זה 5ג.
### בדיקות / e2e
`npm run verify` ירוק (בלי שינוי בבדיקות הקיימות – תוויות, תפקידים ומתגים לא השתנו); `npm run e2e` 5/5, כולל `phone.spec.js`.
### פתוח
לא צולם בדפדפן; השוואה מול `new-08/09/12/18`, dark, LTR ומובייל – 8ב. ל-"סכום מותאם" אין משבצת בגריד (D-116).

---

## שלב 5ג – המחברת שלי (05) (2026-11-21, opus)

### מה השתנה
- **`NotebookPage`:** בלי עטיפה משלו (`p: 3`, `minHeight`, גובה קבוע ו-`overflow` יצאו). `PageHeader` ← CSS grid של 12 מ-md, הערות 7 / צד 5; בטלפון עמודה אחת והרשימה ראשונה כמו קודם. הדף גולל; מ-md הסרגל דביק בראש עמודת ההערות ועמודת הצד דביקה עם גלילה פנימית (D-119, מחליף את D-37).
- **`NotebookHeader`:** `PageHeader` עם "הערה חדשה" (primary, בלי הגרדיאנט התכלת) ו"ייצוא" (`soft`) – אותו תפריט (PDF, Word, פיצול) ואותו tooltip. הסרגל יצא ממנו.
- **`NoteToolbar`:** כרטיס עם כפתורים עגולים של 36, פעיל = accent על `accentSoft` (D-120).
- **`NoteCard` + `RichNoteEditor`:** כרטיס סקשן, כותרת display 30, גוף 16 / 1.9 `ink2` בלי מסגרת משלו, כף כמו במוקאפ (D-121); הפניות למקור ירוקות דרך `features/Notes/noteStyles.js` (D-122). לוגיקת העורך – הדבקה, גרירה, שינוי שם, מחיקת אובייקט, פקודות, טיוטות – לא נגעה; השינוי בעורך הוא ה-`sx` בלבד (+ `common.white` במקום `#fff`).
- **`NotesIndex`:** `SectionCard` עם `SearchBar` + צ׳יפ "בחירה מרובה" (= סמן הכל, שלושה מצבים) ומחיקת הנבחרות לידו; שורות 16 רדיוס, פעילה `accentSoft` + טבעת (D-123, D-124).
- **`BookmarksSidebar`:** כרטיס "הסימניות שלי" נפרד: kicker סוג ← שם שיעור ← צ׳יפים עם `placeShortLabel` (וההערה, כשנכתבה); לחיצה וגרירה כמו קודם, שלושת העוגנים (D-125).
- **`NotesColumn`:** בלי גלילה משלו, `gap` 24; מצב ריק במסגרת המקווקוות עם אריח האייקון.
- **כרטיס המחברת בעמוד השיעור** (`LessonNotebook`) לא שונה – מקבל את כל זה דרך `NoteCard`/`NoteToolbar` (D-126).
- `mediaTypeAccents` נמחק מ-`utilities/constant.js` (המשתמשים האחרונים היו העורך והסימניות); `iconForBookmark` נשאר ב-`mediaIcons.js` בלי משתמש (נבדק). **אין מחרוזות חדשות ואין מפתחות שנמחקו** – כל התוויות כבר היו קיימות (`notebook:title`, `newNote`, `export.*`, `index.*`, `bookmarks.*`).
- החלטות: D-119 עד D-126.

### קבצים
`src/components/pages/notebook/NotebookPage.jsx`, `componentsNotebook/{NotebookHeader,NotesIndex,NotesColumn,BookmarksSidebar}.jsx`, `src/components/features/Notes/{NoteCard,NoteToolbar,RichNoteEditor}.jsx`, `features/Notes/noteStyles.js` (חדש), `features/Notes/NoteCard.test.jsx`, `src/utilities/{constant,mediaIcons}.js`, `design/REDESIGN_V4_{DECISIONS,LOG}.md`.

### בדיקות
- **נכתבה מחדש (מבנה):** `NoteCard.test.jsx` "an unticked one is not" חיפש `2px` בצל – צל הכרטיס החדש (`0 1px 2px …`) מכיל אותו. שתי הבדיקות של הטבעת מחפשות עכשיו `0 0 0 2px` (אותה התנהגות: מסומנת = טבעת, לא מסומנת = בלי).
- **תוקן בקוד, לא בבדיקה:** `NotebookLightList` ("nothing is saved for a note whose body has not arrived") לוחץ על המופע הראשון של שם ההערה – "שנבחרה מהרשימה". בטיוטה הראשונה עמודת ההערות היתה ראשונה ב-DOM, והלחיצה נפלה על כותרת הכרטיס. עמודת הצד חזרה להיות ראשונה ב-DOM (כמו קודם) ומצוירת שנייה מ-md ב-`order` – גם סדר ה-Tab נשמר.
- כל שאר בדיקות המחברת, `features/Notes/*`, `LessonNotebook*`, `SourcePreviewDialog*` עברו בלי שינוי (תוויות, תפקידים, `getByText` של הערת סימנייה).
- **`npm run verify` ירוק** – lint, 170 קבצים / 1891 בדיקות, build, `check:chunks`.
- **`npm run e2e` ירוק – 5/5** בריצה אחת (journey he/en/yi, language, phone). אף spec לא עובר במחברת; ה-journey עובר בעמוד השיעור, שכרטיס המחברת שבו משתמש ב-`NoteCard`. API ו-Vite כבר רצו – לא הופעלו ולא נעצרו. **אין סקריפט חדש ב-`package.json`.**

### פתוח
- לא צולם בדפדפן (הדפדפן לא היה מחובר לחשבון); השוואה מול `new-05`, dark, LTR ומובייל – 8ב. לבדוק שם במיוחד: הסרגל הדביק מעל כרטיסים שגוללים מתחתיו, ועמודת הצד הדביקה כשהיא ארוכה מהחלון.
- D-123 (צ׳יפ = "סמן הכל", תיבות הסימון נשארות) ו-D-125 (ההערה בתוך צ׳יפ הסימנייה) סוטות מהמוקאפ כדי לא לאבד פונקציה – לסקירה.

---

## שלב 6 – 10, 11, 13/14, 15 (2026-11-21, sonnet)

### מה השתנה
- **הקורסים שלי (10):** `PageHeader` (ספירה כ-subtitle, "הצטרפות לקורס" ב-actions), `EmptyState`, כרטיסי קורס ברדיוס 24 עם אריח אייקון `accentSoft` ו-`StatusBadge`ים; ממתינים לאישור – כרטיס עם כפתור `soft`.
- **ניהול קורסים (13/14):** כותרת "ניהול קורסים" בחמש שפות, `PageHeader`, `SegmentedControl`, `EmptyState`, כרטיס קורס עם ריבוע כתום ו-badges, באנר "דף הקורס", קופסת קוד כהה, "התלמידים שלי" ככרטיס (D-127..D-129). אין פריט ניווט מסומן (`isActive`).
- **דף קורס (15):** `BackLink`, `PageHeader`, שורות שיעור וכרטיסי התקדמות/"מי שמע מה" ברדיוס חדש (D-130).
- **מפגשים (11):** `PageHeader`, `EmptyState` (מיקרופון), `SessionCard` (D-131). החדר החי לא נגע – 8ב.
- הוסרו כל עטיפות `p: 3`/`bgcolor`/`maxWidth` של הדפים.
- **קבצים:** `pages/courses/{MyCoursesPage,CoursesPage,CourseTrackPage}.jsx`, `componentsCourses/{JoinCodePanel,MyStudents,CourseReport}.jsx`, `pages/sessions/SessionsPage.jsx`, `locales/*/courses.json` (`title`).

### פתוח
לא צולם בדפדפן; השוואה מול `new-10/11/13/14/15`, dark, LTR ומובייל – 8ב, יחד עם חדר המפגש.

---

## שלב 7 – 16, 17 (2026-11-21, sonnet)

### מה השתנה
- **רכיב חדש:** `features/DataTable/{tableSx.js,TableCard.jsx}` – הטבלה של רכיב 15 (D-132).
- **משתמשים (16):** `PageHeader` עם חיפוש ו"הוספת משתמש" בצד, טבלה בכרטיס עם גלילה פנימית, `StatusBadge` לתפקיד/סטטוס, כפתורי פעולה עגולים 36px, שורה לא פעילה `opacity .5`; בקשות אישור על `fill2` (D-133).
- **לוח בקרה (17):** `PageHeader`, 3 כרטיסי KPI עם display, תתי-כרטיסים `fill2`, סכום AI/SMS ב-display accent, טבלאות תקלות/עלות/תרומות בסגנון המשותף, `SegmentedControl` לתרומות, כפתורי רענון/הרצה מחדש `soft` (D-134). נמחקו עטיפות `p: 3`. אין מחרוזות חדשות.
- **קבצים:** `pages/users/{UsersPage,componentsUsers/*}`, `pages/admin/{AdminDashboard,componentsAdmin/{StatsCards,QueueStatus,AiUsagePanel,SmsUsagePanel,PipelineTrouble,DonationsLedger,TagProposals}}`.

### בדיקות / e2e / פתוח
`npm run verify` ירוק (lint, 170 קבצים / 1891 בדיקות, build, `check:chunks`) – אף בדיקה לא נכתבה מחדש. `npm run e2e` ירוק 5/5 (אישור המרצה ב-`/users` עובד, האימייל פעם אחת). אין סקריפט חדש. לא צולם בדפדפן – השוואה מול `new-16/17`, dark, LTR ומובייל – 8ב. `SystemHealth` לא שונה.

## שלב 8א – צילומים (2026-11-21)

`npm run screens` (חדש; `playwright.screens.config.js` + `e2e/screens/screens.spec.js`, לא חלק מ-`npm run e2e`): מנהל חד-פעמי מאותם fixtures של ה-e2e, קורס, שיעור שמע מפורסם, וידאו כטיוטה (ffmpeg), ספר PDF, לייק, שמירה, רשימה והערה. 77 צילומים ב-`design/qa-shots/<lang>-<mode>-<width>/NN-name.png` (בתיקייה ב-`.gitignore`) ו-`INDEX.md`: עברית בהיר 1440 ו-390 (31 ו-30; המגירה 19 רק ב-390), אנגלית בהיר 1440 (7) + מגירה ב-390, עברית כהה 1440 (8). אפס מסכים שלא הושגו.
- **מגבלות לתשומת לב 8ב:** שום דבר לא תומלל או סוכם, לכן לשוניות 20–24 מראות את מצב "טרם עובד" ולא תמלול/פרקים/סיכום אמיתיים; דף הארכיון, `/users` ולוח הבקרה מציגים גם נתוני dev אמיתיים. צילום fullPage מראה את ה-dock הקבוע באמצע הדף, ואת המגירה (19) כשהדף מאחוריה ארוך.
- הסקיל `run-tests` עודכן (סקריפט `screens`, בריפו השורש). אין שינוי בקוד האפליקציה.
