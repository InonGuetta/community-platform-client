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
