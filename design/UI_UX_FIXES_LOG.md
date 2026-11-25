# UI_UX_FIXES – יומן ריצה

## שלב 2

### 2.1 גלילה כפולה בעמוד מדיה – בוצע
- הוסרו `maxHeight`/`overflowY` מאזור הטאבים והפרופ `contentMaxHeight` (גם מ־`MediaViewPage`). זה גובר על החלטה D-22.
- בחירה שמרנית: התמלול במצב "מעקב" (follow-along) מקבל גלילה פנימית אחת בלבד (`maxHeight: 60vh` ב־md ומעלה) כדי שהשורה המושמעת תישאר בטווח הראייה והמעקב האוטומטי ימשיך לעבוד. במובייל אין גלילה פנימית (כמו קודם).
- רשימת "תגיות מוצעות" (`AiTagSuggestions`) לא הכילה overflow/גובה – אין מה להסיר. תיבות הצ'אט (`ChatPane`, `HistoryPane`) נשארו עם `overflowY: auto` אך בלי גובה חוסם, ולכן בפועל הדף גולל.
- לא נעשתה עמודת מדיה `sticky` (הסעיף אומר "אם צריך"; על מסך נמוך נגן+כיסוי גבוהים מהמסך ויישארו חתוכים).
- קבצים: `pages/mediaView/componentsMediaView/MediaInsightsTabs.jsx`, `pages/mediaView/MediaViewPage.jsx`.

### 2.2 סרגל ניווט תחתון – בוצע
- hook חדש `useDockVisibility` (מסתיר בגלילה מטה מעל 10px, מחזיר בגלילה מעלה, תמיד מוצג בראש/בסוף הדף ובמעבר נתיב), אנימציית translateY, ללא אנימציה תחת `prefers-reduced-motion`. נשאר גלוי כשהפוקוס בתוכו.
- `padding-bottom` לכל הדפים כבר קיים (`PageContainer` + `DOCK_CLEARANCE` = 160) – לא שונה.
- קבצים: `layout/navbar/Dock.jsx`, `layout/navbar/useDockVisibility.js` (+ `useDockVisibility.test.js`).

### 2.3 כרטיסי מדיה כקישורים – בוצע
- `MediaTile`: הכותרת היא `<Link component={RouterLink} to="/media/:id">` עם `::after` מתוח על כל הכרטיס; ה־`article` איבד `tabIndex`/`onClick`/`onKeyDown`. כפתורי ⋯ ולב ושם המרצה קיבלו `position: relative; z-index: 1`. אין `<a>` בתוך `<a>`. פוקוס מקלדת: מסגרת סביב כל הכרטיס (`:focus-visible::after`).
- הפרופ `onView` הוסר מ־`MediaTile`, `MediaGrid` ומכל הקוראים (ארכיון, אוסף, פלייליסט, מדפי פלייליסטים) – כולם רק ניווטו ל־`/media/:id`. החל בכל הרשתות שמשתמשות ב־`MediaGrid`.
- בדיקות: `MediaTile.test.jsx` עטוף ב־`MemoryRouter`; הבדיקה "לחיצה/Enter פותחת" הוחלפה בבדיקה שהכותרת קישור ל־`/media/1`, היחיד בכרטיס.
- `ArchiveHero` (כרטיס ה־hero) לא שונה – לא חלק מהסעיף.
- קבצים: `features/MediaTile/MediaTile.jsx` (+test), `features/MediaGrid/MediaGrid.jsx`, `pages/archive/componentsArchive/ArchiveBrowser.jsx`, `pages/personal/{CollectionPage,PlaylistPage,PlaylistsSection}.jsx`.

### 2.4 מרצה "AI" / "ToolLLM" – בוצע (צד לקוח בלבד)
- `isLeakedCreator` ב־`utilities/creatorPage.js` עם `// TODO(UI_UX_FIXES 5.2)`; שורת המרצה לא מוצגת בכרטיס, ב־`LessonHeader`, ב־`ArchiveHero`, ב־`SmartSearch` ובעמוד האורח.
- בדיקות: `utilities/creatorPage.leaked.test.js`, ובדיקה ב־`MediaTile.test.jsx`.

### לא נבדק
- בדיקה ויזואלית בדפדפן ב־1440/390: ה־API (3001) לא רץ, ולא הופעל. מומלץ לבדוק ידנית: גלילת עמוד מדיה, הסתרת הסרגל בגלילה, פתיחת כרטיס בטאב חדש / לחיצת גלגלת, פוקוס מקלדת על כרטיס.

## שלב 3

### 3.1 ניווט פעיל – בוצע
- ל־`navConfig` נוסף שדה `alsoOn` (קידומות נתיב שמדליקות פריט); "ארכיון" מוגדר עם `alsoOn: ["/media"]`, ולכן `/media/:id` מדליק אותו בכותרת, במגירה ובסרגל התחתון (ה־dock קורא את אותו פריט). הבדיקה "a lesson marks nothing" ב־`Dock.test.jsx` הוחלפה ל"a lesson lights the archive"; נוספה בדיקה ב־`navConfig.test.js`.
- קבצים: `layout/navConfig.js` (+test), `layout/navbar/Dock.test.jsx`.

### 3.2 הבהוב בטעינה – בוצע (בחירה שמרנית)
- אין סימן אמין בצד הלקוח לסשן שמור (העוגייה httpOnly ואין שום דבר ב־localStorage). לכן, כל עוד `fetchMe` לא ענה (`auth.initialized=false`) ואין משתמש, מוצג **skeleton ניטרלי** (לוגו + שני עיגולים אפורים במקום הפעמון והתמונה) במקום header האורח. אחרי התשובה: משתמש ← header מחובר, אין משתמש ← header אורח מינימלי. כל דפי המעטפת מוגנים בהתחברות, ולכן צורת "מחובר" היא הניטרלית.
- קבצים: `layout/navbar/AppHeader.jsx`, `useAccount.js`, `useAppShell.js`, `AppHeader.test.jsx` (נוספה בדיקה).

### 3.3 קפיצת layout – בוצע
- `html { scrollbar-gutter: stable }` ב־`MuiCssBaseline.styleOverrides` (`theme/theme.js`).

### 3.4 סרגל הסינון שקוף מדי – בוצע
- אטימות 0.85 ← 0.96 (צבע הרקע של הדף, לכן גם במצב כהה). צל/קו תחתון רק כשהסרגל נדבק: hook חדש `useStuckBand` (sentinel בגובה 1px לפני הסרגל + IntersectionObserver; בלי IntersectionObserver – אין צל).
- קבצים: `pages/archive/componentsArchive/ArchiveToolbar.jsx`, `useStuckBand.js`.

### 3.5 תפריט החשבון (דסקטופ) – בוצע
- הפריט "ניהול" ← "לוח בקרה" (`nav:links.admin`, חמש שפות; באידיש עדיין `_draft`).
- "החשבון שלי" הוסר מהתפריט; כותרת התפריט (שם + מייל) נשארת הקישור היחיד ל־`/profile`. הפריט נשאר ב־`navConfig` (המגירה משתמשת בו) והתפריט מסנן אותו.
- אייקונים בכל פריט (אותם של המגירה, מהקונפיג; נוספו `Icon` ל־`PRIMARY_LINKS` ול־`ADMIN_ITEMS`) וגם בשורות השפה/התקנה/מצב כהה/יציאה/תצוגת מנהל.
- פריטי הניהול בקבוצה מתקפלת "ניהול" (`aria-expanded`), סגורה כברירת מחדל ונפתחת מעצמה כשהדף הנוכחי בתוכה. מתג תצוגת מנהל ומתג מצב כהה נשמרו, וכל היעדים ניתנים להגעה.
- בדיקות ב־`AppHeader.test.jsx` / `NotificationBell.test.jsx` עודכנו לפתוח את הקבוצה לפני הבדיקה (אותה התנהגות, מבנה חדש), ונוספה בדיקה ש־`/profile` מופיע פעם אחת.
- קבצים: `layout/navConfig.js`, `navbar/AvatarMenu.jsx`, `locales/*/nav.json`.

### 3.6 מובייל – שלושה תפריטים – בוצע
- מתחת ל־md לחיצה על התמונה פותחת את המגירה (`useAppShell.openMenu`); תפריט התמונה נשאר לדסקטופ. ההמבורגר והסרגל התחתון נשארו.
- במגירה: האייקון לפני הטקסט, בצד ההתחלה (`ListItemIcon` + `ListItemText`), לכל קישור – כולל ארכיון, שאל את הארכיון, הקורסים שלי, מפגשים, תרומה ופריטי הניהול.
- לא נבדק בבדיקת יחידה שהתמונה פותחת מגירה (jsdom בלי matchMedia תמיד "רחב").
- קבצים: `navbar/NavDrawer.jsx`, `navbar/useAppShell.js`.

### 3.7 פרטי השיעור – בוצע
- שורת התאריך ("טיוטה · הועלה בתאריך") והתיאור (`media.description`, שם מופיע גם "ועד לאברכים") הועברו ל־`LessonHeader`: מרצה · תאריך בשורה אחת, והתיאור מתחתיה. `data-testid="media-date"` נשמר; הבדיקות ללא שינוי.
- קבצים: `mediaView/MediaViewPage.jsx`, `componentsMediaView/LessonHeader.jsx`.

### 3.8 הערות כפולות – דולג, שאלה לבעלים
- **שאלה:** בעמוד מדיה יש גם טאב "הערות אישיות" (`NotesPanel`, סימניות/הערות על רגע בשיעור) וגם "המחברת שלי לשיעור זה" (`LessonNotebook`). איזה מהשניים להשאיר? (שימו לב: הטאב עוסק בסימניות עם שלוש העוגנים, והמחברת בהערות מלאות עם מקורות.)

### 3.9 עמוד מדיה במובייל – בוצע חלקית
- שיעור שמע: כיסוי 160px במרכז במובייל (`md` ומעלה – רוחב העמודה כמקודם), והנגן מיד אחריו.
- **לא בוצע:** מיני־נגן נדבק בגלילה (סעיף אופציונלי; מורכב – נשאר לשלב נפרד).
- קובץ: `mediaView/MediaViewPage.jsx`.

### 3.10 שלוש כניסות לחיפוש – לא בוצע (החלטת מוצר), שתי הצעות
1. **שדה אחד בארכיון עם מתג "חכם":** בכיבוי – חיפוש טקסט מהיר; בהדלקה – חיפוש עומק. יתרון: כניסה אחת וברורה; חיסרון: חיפוש עומק מחזיר פסקאות ולא פריטים, ולכן התוצאות משנות צורה וה־filter bar לא מתאים להן.
2. **העברת החיפוש החכם ל־`/ask`** (הטאב נעלם מהארכיון, והארכיון נשאר עם שדה אחד): יתרון: כבר קיים שם עיצוב של שאלות ודוגמאות, והארכיון הופך פשוט; חיסרון: מי שמחפש ציטוט מדויק צריך לעבור דף, והחיפוש החכם מאבד את הקשר לפילטרים של הארכיון.

### 3.11 השלמה אוטומטית למרצה – כבר קיים
- `ContentFieldsUpload` כבר `Autocomplete freeSolo` עם `knownCreators` מ־`mediaApi.creators()` (אותו מקור כמסנן "מרצה / מחבר"), ודיאלוג העריכה מקבל אותו (`useArchivePageController.knownCreators`). לא נדרש שינוי.

### 3.12 פרופיל – אימות מייל – בוצע חלקית
- שם התצוגה מוצג בכרטיס העליון מעל המייל.
- **כפתור "שליחת מייל אימות" לא נוסף:** אין endpoint כזה – ב־`authApi` קיים רק `verifyEmail(token)` ובשרת רק `POST /auth/verify-email`. **לשלב 5 (שרת):** `POST /auth/resend-verification` (מוגבל קצב, על המשתמש המחובר) – ואז כפתור בכרטיס מול התגית "כתובת לא אומתה".
- קובץ: `pages/profile/ProfilePage.jsx`.

### 3.13 טבלת משתמשים – בוצע
- הסטטוס מוצג פעם אחת: בעמודת הסטטוס מתג (Switch) עם תווית "פעיל/לא פעיל", מושבת בשורה של עצמך, כמו לפני כן; למי שאינו מנהל (אין הרשאת החלפה) נשארת תגית. כפתור ההחלפה בעמודת הפעולות הוסר.
- המחיקה בתפריט ⋮ (`פעולות נוספות עבור {{name}}`, מפתח חדש `users:more`) ופותחת את דיאלוג האישור הקיים.
- הכותרת "ID / מזהה" ← "מס׳" (חמש שפות: No. / N.º / N° / נומ׳).
- בדיקת `a11yReview.test.jsx` עודכנה: עריכה (כפתור), השבתה (switch), ⋮ (כפתור).
- קבצים: `users/componentsUsers/UsersTableContent.jsx`, `locales/*/users.json`.

### 3.14 שדות חובה עקביים – בוצע
- קורס חדש: כבר היה `*` וכפתור חסום – ללא שינוי. העלאת מדיה: הכפתור נחסם גם כשהכותרת או הסוג ריקים (עד עכשיו חסום רק בלי קובץ; הלחיצה לא עשתה כלום בשקט). הצטרפות לקורס: השדה סומן `required` (הכפתור כבר היה חסום).
- מפגש: הכותרת **אופציונלית בשרת** (`optionalTitle`, נשמר null) – לכן לא סומנה חובה, ונוסף placeholder: "לא חובה. בלי כותרת המפגש יופיע כ״מפגש ללא כותרת״" (`sessions:create.namePlaceholder`, חמש שפות). הכפתור נשאר חסום רק על מועד בעבר.
- קבצים: `features/UploadMedia/UploadMedia.jsx`, `courses/componentsCourses/JoinCourseDialog.jsx`, `sessions/SessionsPage.jsx`.

### בדיקות ולא נבדק (שלב 3)
- lint: 0 שגיאות; build עובר; vitest מלא: עבר (תוקנו בדיקות שקראו מבנה ישן: users switch, CourseJoin label עם `*`).
- לא נבדק בדפדפן (ה־API לא רץ): תפריט החשבון המתקפל, המגירה במובייל מהתמונה, צל הסרגל הנדבק, skeleton ה־header, מתג הסטטוס ו־⋮ בטבלת המשתמשים, כיסוי השמע הקטן.
