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
