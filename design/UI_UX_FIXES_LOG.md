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

## שלב 4

### 4.1 מועד המפגש – בוצע
- `SegmentedControl` (עכשיו / מועד עתידי) במקום התווית "ריק = להתחיל עכשיו" והקישור. שדה התאריך מוצג רק ב"מועד עתידי", ונפתח עם ברירת מחדל (שעה קדימה). `min` והודעת "מועד שעבר" משלב 1 נשמרו. ב"עכשיו" לא נשלח מועד; שדה העזר `when` של הדיאלוג לא נשלח לשרת (`createPayload`). הכפתור מתחלף כמו קודם ("יצירה והתחלה" / "קביעת מפגש") ונחסם ב"מועד עתידי" בלי מועד.
- מפתחות: `sessions:create.now/later`, `create.when` קוצר ל"מועד", `create.schedule` נמחק (חמש שפות).
- קבצים: `pages/sessions/SessionsPage.jsx`, `locales/*/sessions.json`.

### 4.2 מצבי ריק – בוצע (בלי קומפוננטה חדשה)
- `features/EmptyState` קיימת – שימוש חוזר. "הקורסים שלי": כותרת "עדיין אין קורסים" + שורה "קיבלת קוד מהמרצה? אפשר להצטרף איתו." (`courses:mine.none/noneText`). "מפגשים": שורת הסבר מה זה מפגש חי (`sessions:noneActiveText`). "חיפוש עומק חכם": לפני החיפוש הראשון מוצג `EmptyState` עם הסבר ושלוש דוגמאות לחיצות (`archive:smartSearch.introTitle/introText/examples`); לחיצה מפעילה חיפוש (`useSmartSearch.searchFor`).
- קבצים: `MyCoursesPage.jsx`, `SessionsPage.jsx`, `features/SmartSearch/{SmartSearch.jsx,useSmartSearch.js}` (+test), `locales/*/{courses,sessions,archive}.json`.

### 4.3 חיפוש עומק חכם – בוצע
- נשארה זכוכית מגדלת אחת, בצד ההתחלה, והיא גם הכפתור (ספינר בזמן חיפוש). קובץ: `SmartSearch.jsx`.

### 4.4 מחברת – סרגל העריכה – בוצע
- הסרגל פעיל כל עוד יש הערה: לפני שהסמן היה בהערה כלשהי הוא מכוון להערה הראשונה, ולחיצה על כפתור מעבירה את הפוקוס לעורך (`exec` משחזר/יוצר בחירה) ומפעילה את הפעולה. נעשה גם בעמוד השיעור (`LessonNotebook`), שם אותה בעיה. מעומעם רק כשאין אף הערה.
- קבצים: `notebook/NotebookPage.jsx`, `mediaView/useLessonNotebook.js`, `LessonNotebook.jsx`.

### 4.5 מחברת – תיבות סימון – בוצע (גובר על D-123)
- התיבות מוצגות רק במצב "בחירה מרובה". במצב: "ביטול בחירה" (יוצא מהמצב ומנקה את הבחירה, כדי שבחירה נסתרת לא תנהיג ייצוא/מחיקה), "בחירת הכל" (שלושת המצבים: אין/חלק/הכל), מונה "נבחרו N הערות" ומחיקת הנבחרות. כל פעולות הבחירה המרובה נשמרו, וייצוא הנבחרות (כפתור הכותרת) כמו קודם.
- `useNotebookPageController`: `selecting`, `startSelecting`, `cancelSelecting`. בדיקת `NotebookEditing` עודכנה: קודם נלחץ "בחירה מרובה" ובדיקה שהתיבות אינן מוצגות לפני כן.
- מפתחות חדשים: `notebook:index.cancelSelect`, `index.selectAllShort`.

### 4.6 אייקון הייצוא – בוצע
- `IosShare` ← `FileDownloadOutlined` ב־`NotebookHeader.jsx`.

### 4.7 קישור החזרה בעמוד מדיה – כבר מתקיים
- `BackLink` (מערכת העיצוב החדשה) כבר משתמש ב־`DirectionalIcon toward="back"`: ב־RTL הוא מצביע ימינה, לפני הטקסט. לא נדרש שינוי.

### 4.8 "ערב טוב, ADMIN" – בוצע
- שם המשתמש בברכה (`<bdi>`) מקבל `text-transform: none`; שאר ה־kicker נשאר באותיות גדולות (עיצוב). קובץ: `archive/componentsArchive/ArchiveGreeting.jsx`.

### 4.9 יחיד/רבים – בוצע
- i18next 27: בעברית `_one/_two/_other` (כך כבר נעשה ב־`courses.json`, וגם "בקשת הצטרפות אחת" כבר היה תקין), בשאר השפות `_one/_other`; `localeParity.test.js` מתעלם מסיומות ריבוי ועובר. הומרו (עברית עם צורת זוגי "שתי/שני"): `archive:selected.tagCount`, `tree.partialSpoken`, `tags:parent.below`, `admin:ai.audioMinutes`, `notebook:index.selected`, `export.selectedTooltip/selectedCount/allCount/summaryFiles/summaryNotes/filesCreated`, `export.splitDialog.fileName/run`. הקריאות שולחות `count` (`aiUsageFormat.js`, `NotebookPage.jsx`, `useNotesExport.js`, `ExportSplitDialog.jsx`).
- **לא הומרו** (בחירה שמרנית): מפתחות שבהם הכמות כבר מנוסחת במפתחות נפרדים (`chat:quota`, `downloads:removeAll`), טקסטים עם מספר שמגיע מהשרת כפרמטר (`PHONE_CODE_INVALID` "נותרו N ניסיונות", `PHONE_SEND_LIMIT`), `format:track.progress` (M שיעורים, M ≥ 2 בפועל; שיעור יחיד מטופל כבר ב־`oneDone`), מגבלות קבועות ("עד 5 תגיות"), `export.splitDialog.totals` (שני מספרים בשורה), `sessions:recording.hostMany` (תמיד 2 ומעלה).
- בדיקות עודכנו לנוסח החדש: "ייצוא קובץ אחד / שני קבצים", "נבחרו שתי הערות / נבחרה הערה אחת".

### 4.10 לשון פנייה – בוצע (עברית בלבד)
- כ־95 מחרוזות ב־`locales/he/*.json`: הוראות ← צורה סתמית ("לוחצים על", "מקלידים", "גוררים", "מזינים", "מסמנים", "יוצרים"); "נסה שוב" במשפט ← "אפשר לנסות שוב", ובכפתור ← "ניסיון חוזר"; "יש להפעיל / לוודא / לרענן" בהודעות שגיאה; תוויות כפתורים ← שם פעולה ("שמירה", "שליחה", "מחיקה", "חיפוש", "הפעלת תמלול", "הפקת סיכום", "יצירת כותרות משנה", "תיקון עברית", "הוספת תגית", "דילוג", "הצגת/הסתרת סיסמה", "התחברות/הרשמה באמצעות…"). הפניות פנימיות בטקסטים (כפתור המוזכר בהודעה) עודכנו יחד.
- **לא שונו** (בחירה שמרנית): שמות התכונה "שאל את הארכיון" / "שאל" (שם מוצר בניווט ובסרגל), ההצעה לצ'אט "סכם בשלוש נקודות" (שאלה של המשתמש ל־AI), שמות פעולה קיימים בצורת שם ("המשך לתשלום", "המשך צפייה"), ושאר השפות.
- בדיקות שקראו את הנוסח הישן עודכנו לנוסח החדש (אותה התנהגות), כולל בדיקות תחת `pages/auth/` – הטקסט בלבד, לא הקוד (D-144).

### 4.11 פרופיל – ניווט עוגנים – בוצע
- `ProfileSectionNav.jsx`: פס צ'יפים נדבק מתחת לכותרת האתר (פרטים · טלפון · התראות · סיסמה), כל אחד קישור אמיתי ל־`#id` של הכרטיס, גלילה חלקה (מיידית תחת `prefers-reduced-motion`) בלי לשנות את ה־URL; `scroll-margin` מפצה על הכותרת והפס. לא נעשה סימון "חלק פעיל" בגלילה.
- קבצים: `profile/ProfilePage.jsx`, `ProfileSectionNav.jsx`, `locales/*/profile.json` (`nav.*`).

### 4.12 העלאת מדיה – בוצע
- זיהוי סוג לפי MIME כבר היה (`detectMediaType`); נוסף: נפילה לסיומת כשהדפדפן לא מדווח MIME, הערה "זוהה אוטומטית לפי הקובץ. אפשר לשנות." בשדה הסוג (נעלמת כשמשנים ידנית), והשדה נשאר ניתן לשינוי.
- אזור ההעלאה הוא גם אזור גרירה (הדגשה בזמן גרירה; נגיש במקלדת: `role=button`, Enter/רווח), עם הטקסט "גררו קובץ לכאן או לחצו לבחירה". קובץ מסוג שאינו מותר (כמו ה־`accept` של הקלט) נדחה בהודעה (`upload:notAllowed`). מה שנשלח לשרת לא השתנה.
- קבצים: `features/UploadMedia/{UploadMedia.jsx,ContentFieldsUpload.jsx,useUploadMedia.js}` (+test), `locales/*/upload.json`.

### בדיקות ולא נבדק (שלב 4)
- lint: 0 שגיאות (אזהרה קיימת אחת ב־`useAdminDashboardController`, לא קשורה); build ו־`check:chunks` עוברים; vitest מלא: 1909 עברו אחרי עדכון בדיקות שקראו נוסח ישן (נוספו 4 בדיקות: דוגמאות חיפוש + מגדלת אחת, גרירת קובץ ×2, ומצב הבחירה המרובה בבדיקה קיימת).
- לא נבדק בדפדפן: ה־API וה־Vite רצים, אבל פרטי ההתחברות לבדיקות נמצאים בקובץ מקומי שאינו במעקב, ולא נעשה בו שימוש. לבדיקה ידנית: דיאלוג מפגש חדש, מצב בחירה מרובה במחברת וסרגל העריכה, ניווט העוגנים בפרופיל, גרירת קובץ להעלאה, חיפוש חכם (דוגמאות).

## סיכום סופי (שלבים 2–4)

### 1. מה בוצע, לפי שלבים
**שלב 2 (עדיפות גבוהה)**
- 2.1 גלילה כפולה בעמוד מדיה: `MediaInsightsTabs.jsx`, `MediaViewPage.jsx` (התמלול במעקב נשאר עם גלילה פנימית אחת, `60vh` מ־md).
- 2.2 סרגל תחתון מסתתר בגלילה: `layout/navbar/Dock.jsx`, `useDockVisibility.js` (+test).
- 2.3 כרטיסי מדיה כקישורים: `features/MediaTile/MediaTile.jsx` (+test), `features/MediaGrid/MediaGrid.jsx`, `archive/componentsArchive/ArchiveBrowser.jsx`, `personal/{CollectionPage,PlaylistPage,PlaylistsSection}.jsx`.
- 2.4 מרצה "AI"/"ToolLLM": `utilities/creatorPage.js` (+test), `MediaTile`, `LessonHeader`, `ArchiveHero`, `SmartSearch`, עמוד האורח.

**שלב 3 (עדיפות בינונית)**
- 3.1 ניווט פעיל: `layout/navConfig.js`, `Dock.test.jsx`. 3.2 skeleton ל־header: `AppHeader.jsx`, `useAccount.js`, `useAppShell.js`. 3.3 `scrollbar-gutter`: `theme/theme.js`. 3.4 סרגל סינון אטום: `ArchiveToolbar.jsx`, `useStuckBand.js`.
- 3.5 תפריט חשבון מקובץ עם אייקונים: `navbar/AvatarMenu.jsx`, `navConfig.js`, `locales/*/nav.json`. 3.6 מגירה במובייל: `navbar/NavDrawer.jsx`, `useAppShell.js`. 3.7 פרטי שיעור בכותרת: `MediaViewPage.jsx`, `LessonHeader.jsx`.
- 3.9 כיסוי שמע קטן במובייל: `MediaViewPage.jsx`. 3.12 שם תצוגה בפרופיל: `ProfilePage.jsx`. 3.13 טבלת משתמשים: `users/componentsUsers/UsersTableContent.jsx`, `locales/*/users.json`. 3.14 שדות חובה: `UploadMedia.jsx`, `JoinCourseDialog.jsx`, `SessionsPage.jsx`.
- 3.11 כבר היה קיים (`ContentFieldsUpload`, Autocomplete freeSolo).

**שלב 4** – ראו למעלה: 4.1–4.6 ו־4.8–4.12 בוצעו; 4.7 כבר מתקיים.

### 2. סעיפים שדולגו / בוצעו חלקית, ולמה
- 3.8 הערות כפולות – דולג (דורש החלטה).
- 3.10 שלוש כניסות לחיפוש – לא בוצע בכוונה (החלטת מוצר); הצעות למטה.
- 3.9 – מיני־נגן נדבק לא נעשה (אופציונלי ומורכב).
- 3.12 – כפתור "שליחת מייל אימות" לא נוסף כי אין endpoint.
- 3.11, 4.7 – כבר מתקיימים בקוד.
- 4.9 – מפתחות ריבוי שלא הומרו, ראו פירוט בשלב 4. 4.10 – שמות מוצר ("שאל את הארכיון") נשארו.
- 2.1 – עמודת מדיה לא נעשתה `sticky` (הסעיף אומר "אם צריך").

### 3. השאלה על 3.8 וההצעות ל־3.10
- **שאלה (3.8):** בעמוד מדיה יש גם טאב "הערות אישיות" (`NotesPanel`: סימניות/הערות על רגע בשיעור, עם שלוש העוגנים) וגם "המחברת שלי לשיעור זה" (`LessonNotebook`: הערות מלאות עם מקורות). איזה להשאיר? (אפשרות ביניים: להשאיר את שניהם ולשנות שמות – "סימניות" ו"מחברת".)
- **הצעות (3.10):** (א) שדה חיפוש אחד בארכיון עם מתג "חכם" – כניסה אחת וברורה, אבל חיפוש עומק מחזיר פסקאות ולא פריטים, והתוצאות משנות צורה וה־filter bar לא מתאים להן. (ב) העברת החיפוש החכם ל־`/ask` – כבר יש שם עיצוב של שאלות ודוגמאות והארכיון נשאר עם שדה אחד, אבל מי שמחפש ציטוט מדויק עובר דף והחיפוש מאבד את הפילטרים.

### 4. מה צריך לשנות בשרת (שלב 5)
- 5.1 ולידציה זהה ללקוח: משתתפים 2–500 שלם ובדיוק 2 ל"אחד על אחד"; מועד מפגש לא בעבר; סכום תרומה ≥ 10 ועם מקסימום; בחיפוש `from ≤ to`. (הלקוח כבר מגן על כך.)
- 5.2 "AI"/"ToolLLM" כשם מרצה: למצוא איפה ה־pipeline כותב את הערך ולהפסיק (null כשאין מרצה), ומיגרציה/סקריפט שמנקה רשומות קיימות; אז אפשר למחוק את `isLeakedCreator` (סומן `TODO(UI_UX_FIXES 5.2)`).
- 5.3 שם משובש: משתמש מס' 9 (`notif-test-…@example.test`) מוצג כ־`������` – לתקן את נתיב היצירה (UTF-8) ולעדכן את הרשומה.
- נוסף משלב 3.12: `POST /auth/resend-verification` (מוגבל קצב, על המשתמש המחובר) – ואז כפתור "שליחת מייל אימות" בכרטיס הפרופיל ליד התגית "כתובת לא אומתה".
- נוסף משלב 4: הודעות עם מספר שמגיע מהשרת כפרמטר (`PHONE_CODE_INVALID` "נותרו N ניסיונות", `PHONE_SEND_LIMIT` "בעוד N דקות") אינן מתורגמות בריבוי – אם השרת ישלח גם `count`, אפשר להמיר אותן.

### 5. מה כדאי לבדוק ידנית בדפדפן (1440 ו־390, גם מצב כהה ו־RTL)
- **שלב 2:** פתיחת כרטיס מדיה בטאב חדש וגם בלחיצת גלגלת (הקישור והעתקת כתובת); מקלדת: פוקוס על כרטיס; הסרגל התחתון נעלם בגלילה למטה וחוזר בגלילה למעלה ובראש/סוף הדף; בעמוד מדיה – גלגלת העכבר מזיזה את הדף (אין גלילה מקוננת), ותמלול ארוך גולל פנימית פעם אחת בלבד, והשורה המושמעת נשארת בטווח הראייה.
- **שלב 3 (שלא נבדק בדפדפן):** תפריט החשבון המתקפל (קבוצת "ניהול", אייקונים, כותרת כקישור יחיד לפרופיל); במובייל לחיצה על התמונה פותחת את המגירה, והאייקונים במגירה צמודים לטקסט; צל הסרגל הנדבק בארכיון (רק כשנדבק) ואטימותו; skeleton של ה־header ברענון מלא; מתג הסטטוס ותפריט ⋮ בטבלת המשתמשים; כיסוי השמע הקטן במובייל; שורת "מרצה · תאריך" והתיאור בכותרת השיעור.
- **שלב 4:** דיאלוג "מפגש חדש" (עכשיו/מועד עתידי); מחברת: סרגל עריכה פעיל לפני שהסמן בהערה, מצב בחירה מרובה; ניווט העוגנים בפרופיל (כולל גלילה מתחת לכותרת); גרירת קובץ לאזור ההעלאה; חיפוש חכם עם דוגמאות; קריאת הטקסטים בעברית בצורה הסתמית (בעיקר הודעות שגיאה וכפתורים); עמוד מדיה – החץ ב"הארכיון" מצביע ימינה.

## 3.8 – החלטת אינון (2026-11-25): אפשרות א׳
שני האזורים נשארים, ושמותיהם משתנים כדי שלא ייראו כפולים: הטאב "הערות אישיות" (סימניות על רגע בהקלטה או מקום בעמוד) נקרא עכשיו **"סימניות"**, והאזור שמתחת לעמוד, "המחברת שלי לשיעור זה" (ההערות המלאות של השיעור), נקרא **"המחברת שלי"**. שינוי טקסט בלבד, בחמש השפות (`lesson:tabs.notes`, `lesson:notebook.title`), ובמילים שהאתר כבר משתמש בהן לאותם דברים. קבצים: `src/locales/*/lesson.json`, שתי בדיקות שקוראות את שמות הטאבים, והערות בקוד.

## 3.10 – החלטה (2026-11-25): נשאר כמו היום
אינון השאיר את ההחלטה לשיקול דעתי. שלוש הכניסות לחיפוש נשארות כמו שהן: כל אחת עונה על צורך אחר (מציאת פריט / מציאת פסקה בתוכן / שאלה עם תשובה מנומקת), ושתי ההצעות מחליפות בעיה אחת בבעיה אחרת – שדה אחד עם מתג מערבב תוצאות משני סוגים תחת סרגל סינון שמתאים רק לאחד, והעברה ל־`/ask` מנתקת את חיפוש הציטוט מהפילטרים. כדאי לחזור לזה כשיהיו נתוני שימוש: אם הטאב "חיפוש עומק חכם" כמעט לא בשימוש, ההצעה השנייה הופכת לפשוטה.

## שלב 5 – שרת (2026-11-25)
בוצע בריפו `community-platform-server` (ענף `ui-ux-fixes`) ובצד הלקוח של שליחת מייל האימות. כל בדיקת קלט היא guard ב־`lib/validate.js` עם הודעת 400 שלו. לא נוסף קוד שגיאה חדש, ולכן אין שינוי ב־`apiError.js`.

### 5.1 ולידציה זהה ללקוח
- **משתתפים:** guard חדש `sessionCapacity` – מספר שלם בין 2 ל־500 (היה 1–100), ו"אחד על אחד" בדיוק 2. ערך חסר ב"אחד על אחד" נשמר כ־2, ובשאר הסוגים נשאר "ללא הגבלה" כמו היום. `controllers/controllersSessions.js`.
- **מועד מפגש:** השרת כבר דחה זמן שעבר. `optionalSessionStart` דורש לפחות דקה קדימה ולכל היותר שנה, ולא שיניתי אותו. בלקוח ה־`min` של שדה המועד הוא עכשיו הדקה השלמה הראשונה שרחוקה לפחות דקה מעכשיו, כך שהשדה לא מציע זמן שהשרת ידחה. תוקנה גם ההערה ב־`SessionsPage.jsx` שטענה שהשרת לא דוחה.
- **תרומה:** guard חדש `donationAmountCents` – בין 1000 ל־10,000,000 אגורות (₪10–₪100,000; היה ₪1–₪10,000). מלבד הגבולות אין שינוי בזרימת Stripe. בלקוח הכפתור נחסם גם מעל ₪100,000 (`DonateForm.jsx`).
- **טווח תאריכים בארכיון:** guard חדש `uploadDateRangeFilter` – אם `uploadedAfter` מאוחר מ־`uploadedBefore` מוחזר 400. אותו יום בשני הקצוות מותר. שמות הפרמטרים לא שונו (זוג 5).
- בדיקות: `test/inputChecks.test.js`, `test/inputGuards.test.js` (סכומים בשני הקצוות, טווח הפוך דרך ה־route), `test/validate.test.js`.

### 5.2 "AI" / "ToolLLM" כשם מרצה
- **ממצא:** שום קוד בשרת לא כותב "AI" או "ToolLLM". הערך הגיע כ־`creatorName` מהלקוח בהעלאה, כנראה מכלי אוטומטי שמילא את השדה בשם שלו. במסד יש שורה אחת כזו: #117 "שמירת הברית" (audio, הועלה ע"י משתמש #1 ב־2026-11-17), עם "AI". אין במסד שורה עם "ToolLLM".
- **עצירה:** `cleanCreatorName` ב־`services/servicesMedia.js` שומר "כללי" (`DEFAULT_CREATOR`) במקום "AI"/"ToolLLM", בלי תלות באותיות גדולות ורווחים, גם בהעלאה וגם בעריכה. שם שרק מכיל את האותיות (למשל "AIDAN") נשאר כמו שהוא. **החלטה:** "כללי" ולא NULL, כי העמודה `creator_name` היא NOT NULL בכוונה (מיגרציה 020), ו"כללי" הוא כבר הערך שמסמן "לא צוין מרצה", והלקוח מציג אותו כ"ללא מרצה".
- **ניקוי:** `scripts/fix-leaked-creators.js` (`npm run fix:leaked-creators`, עם `-- --dry`), דרך `findPlaceholderCreators` / `clearPlaceholderCreators` בשירות. שתי הפונקציות משתמשות באותו תנאי, כך שהרצה יבשה מציגה בדיוק את מה שהרצה אמיתית תשנה.
- בדיקות: `test/creatorName.test.js`.
- **נשאר:** אחרי ההרצה האמיתית אפשר למחוק את `isLeakedCreator` מהלקוח (`TODO(UI_UX_FIXES 5.2)`). הוא נשאר בינתיים, כי השורה במסד עוד לא נוקתה. הערה: ייתכן ש־#117 הוא שיעור שנוצר ב־AI ו"AI" נכתב בו בכוונה. כדאי לוודא את זה לפני ההרצה האמיתית.

### 5.3 שם משובש (משתמש 9)
- **ממצא:** החשבון לא נוצר מקוד בריפו. הוא נוצר בבדיקה ידנית של סשן קודם, ב־`curl` מ־Git Bash ב־Windows, עם `displayName` בעברית בתוך ארגומנט `-d`. ה־code page של המסוף אינו UTF-8, ולכן כל אות הגיעה כבתים לא תקינים ונשמרה כ־U+FFFD. החשבון השני (10) נוצר באותו סשן דרך `fetch` של Node ותקין.
- **תיקון נתיב היצירה:** אין קוד שאפשר לתקן, אז השרת מונע את התקלה מכל מקור. `cleanDisplayName` (`services/servicesAuth.js`) דוחה שם שמכיל U+FFFD עם 400 "Display name was not sent as UTF-8 text". הבדיקה חלה על הרשמה, עריכת פרופיל, ויצירה ועריכה ע"י מנהל.
- **תיקון הרשומה:** `scripts/fix-garbled-names.js` (`npm run fix:garbled-names`, עם `-- --dry`). האותיות המקוריות אבדו, ולכן הסקריפט משחזר רק שם שידוע: חשבונות `notif-test-<n>@example.test` נרשמו בשם "משתמש בדיקה להתראות" (כך מופיע בפקודה שיצרה אותם). כל שם משובש אחר רק מוצג ולא משתנה. העדכון בודק שוב את הסימן, כדי לא לדרוס שם שתוקן בינתיים ביד. השירות: `findGarbledDisplayNames` / `repairGarbledDisplayName` ב־`services/servicesUsers.js`.
- בדיקות: `test/garbledNames.test.js`.

### שליחת מייל אימות מחדש (מ־3.12)
- **שרת:** `POST /api/auth/resend-verification` – `verifyToken`, ומגבלת קצב של 5 לשעה לכל משתמש (`userRateLimit`; אותה מכסה כמו נתיבי השחזור, אבל לפי חשבון ולא לפי IP). משתמש באותו טוקן של ההרשמה (`issueVerificationToken`, purpose verify, 24 שעות) ובאותו `sendVerificationEmail`. לא נוצרה שיטת טוקן חדשה. הנתיב לא מקבל שום דבר מגוף הבקשה. התשובה היא `{ sent, alreadyVerified }`. **החלטה לגבי enumeration:** הכתובת היא של המשתמש המחובר עצמו, ולכן אין מה לחשוף, והתשובה אומרת בדיוק מה קרה: נשלח, לא נשלח (שרת המייל לא זמין או לא מוגדר; הקישור עדיין תקף), או שהכתובת כבר מאומתת (ואז לא נוצר טוקן). שורה ב־`test/roleMatrix.test.js` (signed-in). בדיקות: `test/resendVerification.test.js` (שירות, 401, תשובות, 429 בבקשה השישית).
- **לקוח:** `authApi.resendVerification` (`src/api/authApi.js`). הלוגיקה ב־`useProfilePageController.js` (`handleResendVerification`, `resendingVerification`), שקורא ישירות ל־`src/api`. אם הכתובת כבר מאומתת, הוא קורא שוב את החשבון (`fetchMe`) כדי שהתגית תתעדכן. הכפתור "שליחת מייל אימות" נמצא ליד התגית "כתובת לא אומתה" ב־`ProfilePage.jsx`. ההודעות (`profile:verification.*`) כתובות בחמש השפות: נשלח, כבר מאומתת, ונכשל. בדיקות ב־`ProfilePage.test.jsx`.
- הערה: בפיתוח בלי SMTP המייל רק נכתב ללוג, והתשובה היא `sent: false`, כלומר הודעת "לא ניתן לשלוח". זה מדויק, כי שום מייל לא יצא.

### קבצים
- **שרת:** `lib/validate.js`, `controllers/controllersSessions.js`, `controllers/controllersDonations.js`, `controllers/controllersMedia.js`, `controllers/controllersAuth.js`, `routes/routersAuth.js`, `services/servicesMedia.js`, `services/servicesAuth.js`, `services/servicesUsers.js`, `scripts/fix-leaked-creators.js`, `scripts/fix-garbled-names.js`, `package.json`. בדיקות: `test/inputChecks.test.js`, `test/inputGuards.test.js`, `test/validate.test.js`, `test/creatorName.test.js`, `test/roleMatrix.test.js`, `test/garbledNames.test.js`, `test/resendVerification.test.js`.
- **לקוח:** `src/api/authApi.js`, `src/components/pages/profile/{ProfilePage.jsx,useProfilePageController.js,ProfilePage.test.jsx}`, `src/locales/*/profile.json`, `src/components/pages/sessions/SessionsPage.jsx`, `src/components/pages/donate/DonateForm.jsx`.
- **ריפו השורש** (לא בקומיט של שני הריפואים): `CLAUDE.md` (שורת "Other server scripts") ו־`.claude/skills/run-migrations/SKILL.md` (רשימת הסקריפטים החד־פעמיים). שני הסקריפטים החדשים נוספו לשניהם.

### הרצה יבשה מול המסד (2026-11-25)
```
npm run fix:leaked-creators -- --dry
1 lesson(s) attributed to a tool's label rather than a person:
  #117  "AI"  audio  uploader #1  2026-11-17T10:34:20.355Z  שמירת הברית
--dry: nothing was changed. A real run sets each to "כללי".

npm run fix:garbled-names -- --dry
1 account(s) with a garbled display name:
  #9  notif-test-…@example.test  inactive  → "משתמש בדיקה להתראות"
--dry: nothing was changed. A real run repairs 1 of 1.
```
לא בוצעה שום כתיבה למסד. ההרצות האמיתיות (מתוך `community-platform-server/`): `npm run fix:leaked-creators` ו־`npm run fix:garbled-names`.

### נשאר
- ההרצות האמיתיות של שני הסקריפטים, ואחריהן מחיקת `isLeakedCreator` בלקוח.
- `npm run smoke` לא הורץ. לפי הכותרת של `scripts/smoke.js` הוא כותב באמת למסד (סימנייה שנוצרת ונמחקת), וזה מנוגד לכלל "בלי כתיבה למסד" של השלב הזה. ה־SELECT-ים החדשים כן רצו מול המסד האמיתי בהרצות היבשות.
- 500 משתתפים ב־full mesh של WebRTC לא באמת יעבוד. הגבול נקבע כך כדי להתאים לדיאלוג, לפי ההחלטה בשלב 1.
- מהסיכום של שלב 4: `count` בפרמטרים של `PHONE_CODE_INVALID` / `PHONE_SEND_LIMIT` לא טופל בשלב הזה.
