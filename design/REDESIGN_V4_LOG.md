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
