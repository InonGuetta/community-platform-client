# Redesign v4 – מפה (שלב 0)

נכתב בשלב 0 מתוך הקוד בענף `redesign-v4` ומתוך קובצי ה-HTML של המוקאפים. לא נפתח אף `old-*.png` – זהות כל מסך ברורה מה-HTML ומהקוד.
ההחלטות שמוזכרות כאן (`D-NN`) מפורטות ב-`REDESIGN_V4_DECISIONS.md`.

קיצורים בטבלאות: `pages/` = `src/components/pages/`, `features/` = `src/components/features/`, `layout/` = `src/components/layout/`.

קבצי עזר מקומיים (gitignored, רק בדיסק):
- `design/redesign-v4/_tokens.css` – בלוק ה-`<style>` המשותף + צבעי `tailwind.config`. **אומת: זהה (אותו hash) בכל 31 הקבצים**, וגם ה-`tailwind.config` זהה בכולם.
- `design/redesign-v4/_coverart.js` – `art()` ו-`P` (15 פלטות) מ-`02-archive.html`, לשלב 3א.

---

## 1. מסך ← route ← קבצים

| # | מסך | Route (מ-`src/App.jsx`) | Page / controller | קומפוננטות עיקריות היום |
|---|---|---|---|---|
| 01 | התחברות | `/sign-in` (ב-`AUTH_PATHS`, בלי Navbar) | `pages/auth/SignIn.jsx`, `useAuthSubmit.js` | `pages/auth/AuthLayout.jsx` (תמונת רקע, כרטיס זכוכית, גלובוס שפה צף), `SocialSignIn.jsx`, `authShared.jsx` (אייקוני social, `socialButtonSx`), `useOAuthError.js` |
| 30 | הרשמה | `/sign-up` | `pages/auth/SignUp.jsx`, `useAuthSubmit.js` | `AuthLayout`, `ToggleButtonGroup` של תפקיד (student/lecturer/admin) + Alert "needsApproval", `SocialSignIn` |
| 31 | איפוס סיסמה | `/forgot-password` | `pages/auth/ForgotPassword.jsx`, `useForgotPassword.js` | `AuthLayout`. אותו layout משמש גם את `ResetPassword.jsx` (`/reset-password`), `VerifyEmail.jsx` (`/verify-email`), `Unsubscribe.jsx` (`/unsubscribe`). `GoogleCallback.jsx` (`/auth/google/callback`, `/auth/callback`) הוא spinner בלי `AuthLayout` |
| 02 | ארכיון | `/archive` (גם `/` ו-`*` מפנים לכאן) | `pages/archive/ArchivePage.jsx`, `useArchivePageController.js`, `useArchiveUpload.js` | `componentsArchive/ArchiveGreeting.jsx` (+`useGreeting.js`), `ArchiveBrowser.jsx` (משותף לדף יוצר), `FilterBar.jsx` (טוגל סוג, מיון, חיפוש, פאנל), `MediaGrid` → `MediaCard`, `EditMediaDialog.jsx`, `EditTagsDialog.jsx`, `ConfirmingDeletionDialog`, `features/UploadMedia/UploadMedia.jsx` (נפתח דרך `uiSlice.openUpload`). תמונת צד `/images/central_image.png` |
| 03 | חיפוש עומק חכם | `/archive`, טאב 2 (state מקומי `tab` ב-`ArchivePage`) | `ArchivePage.jsx` | `features/SmartSearch/SmartSearch.jsx` + `useSmartSearch.js` |
| 29 | פאנל סינון | `/archive` (Collapse בתוך `FilterBar`) | `useArchivePageController.js`, `archiveFilterParams.js` | `FilterBar.jsx`, `TagDrilldown.jsx`, `SelectedTags.jsx`, `typeSelection.js`, `sortOptions.js`, `utilities/durationOptions.js` |
| 04 | המשך צפייה | `/continue` (`CONTINUE_SHELF` ב-`layout/personalShelves.js`) | `pages/personal/CollectionPage.jsx`, `useCollectionPageController.js` | `MediaGrid` → `MediaCard` |
| 06 | התוכן שאהבתי | `/likes` (`LIKES_SHELF`) | `CollectionPage.jsx` | `MediaGrid` |
| 07 / 28 | תוכן שמור + רשימה פתוחה | `/saved` (`SAVED_SHELF`, `showsLists`); רשימה בודדת: `/saved/lists/:playlistId` (`SAVED_LIST_ROUTE`) | `CollectionPage.jsx`; `PlaylistPage.jsx` + `usePlaylistPageController.js` | `PlaylistsSection.jsx` + `usePlaylistsSection.js` (כל רשימה = כותרת + 3 פריטים + חץ "עוד" + "לרשימה המלאה") |
| 25 | עמוד יוצר | `CREATOR_ROUTE` (`utilities/creatorPage.js`), keyed by name | `pages/creators/CreatorPage.jsx`, `useCreatorPageController.js`, `creatorSummary.js` | `ArchiveBrowser` (crossing מותר ב-`imports.test.js`), כפתור חזרה עם `DirectionalIcon` |
| 05 | המחברת שלי | `/notebook` (`NOTEBOOK_SHELF`) | `pages/notebook/NotebookPage.jsx`, `useNotebookPageController.js`, `useNoteBodies.js`, `useNotesSearch.js`, `useNotesExport.js`, `useSourceTrail.js` | `componentsNotebook/NotebookHeader.jsx`, `NotesIndex.jsx`, `NotesColumn.jsx`, `BookmarksSidebar.jsx`, `ExportSourcesDialog.jsx`, `ExportSplitDialog.jsx`; `features/Notes/*` (`RichNoteEditor`, `NoteToolbar`, `NoteCard`, `UntitledNoteDialog`, `useNoteEditing`); `pages/mediaView/componentsMediaView/SourcePreviewDialog.jsx` (crossing מותר) ב-`features/FloatingWindow` |
| 08 | הורדות להאזנה | `/downloads` (`DOWNLOADS_SHELF`, `offlineOk`) | `pages/downloads/DownloadsPage.jsx`, `useDownloadsPageController.js`, `downloadsText.js` | `OfflinePlayer.jsx` (+`useOfflinePlayer.js`, `<audio controls>` נייטיב), `ConfirmingDeletionDialog` |
| 09 | שאל את הארכיון | `/ask` | `pages/askArchive/AskArchivePage.jsx`, `useAskArchivePageController.js` | `features/ChatPane/ChatPane.jsx` (משותף עם טאב "דיון עם AI"; כולל `CopyConversationButton`, "שיחה חדשה") |
| 10 | הקורסים שלי | `/my-courses` | `pages/courses/MyCoursesPage.jsx`, `useMyCoursesPageController.js` | `NoDataDialog`, `componentsCourses/JoinCourseDialog.jsx`, רשימת בקשות ממתינות + ביטול |
| 11 | מפגשים | `/sessions` | `pages/sessions/SessionsPage.jsx`, `useSessionsPageController.js` | כרטיסי מפגשים פעילים (join) ועתידיים (open, `.ics`), דיאלוג יצירה, `NoDataDialog` |
| — | חדר מפגש (אין מוקאפ) | `/sessions/:id` | `pages/sessions/SessionRoom.jsx`, `useSessionRoomController.js` | `features/VideoRoom/*`. גובה `calc(100vh - 64px)` |
| 12 | תרומה | `/donate`; תוצאה: `/donate/result` (אין מוקאפ) | `pages/donate/DonatePage.jsx`, `useDonatePageController.js`; `DonateResultPage.jsx` | `DonateForm.jsx` (`PRESET_AMOUNTS=[50,100,250,500]`, חודשי disabled + tooltip), `PaymentStep.jsx` (Stripe), `DonationResult.jsx`, `MyDonations.jsx`, `donationText.js` |
| 13 / 14 | ניהול קורסים (+ מורחב) | `/courses` (`allowedRoles: lecturer, admin`) | `pages/courses/CoursesPage.jsx`, `useCoursesPageController.js` | `Accordion` לכל קורס, `ToggleButtonGroup` "כל הקורסים / שלי" (למרצה), `componentsCourses/CourseFormDialog.jsx`, `JoinCodePanel.jsx` (+hook), `CourseRoster.jsx` (+hook, CSV), `MyStudents.jsx`, `ConfirmingDeletionDialog` |
| 15 | דף קורס | `/my-courses/:id` | `pages/courses/CourseTrackPage.jsx`, `useCourseTrackPageController.js` | `LessonRow` (button עם שם השיעור), גרירה לסידור (מרצה), `LinearProgress`, `componentsCourses/CourseReport.jsx` (+`useCourseReport.js`) "מי שמע מה" |
| 16 | משתמשים | `/users` (admin) | `pages/users/UsersPage.jsx`, `useUsersPageController.js` | `componentsUsers/UsersHeader.jsx` (`SearchBar` + "הוספה"), `PendingApprovals.jsx`, `UsersTable.jsx`, `UsersTableContent.jsx`, `UserFormDialog` (בתוך `UsersPage.jsx`), `ConfirmingDeletionDialog` |
| 17 | לוח בקרה | `/admin` (admin) | `pages/admin/AdminDashboard.jsx`, `useAdminDashboardController.js` | `componentsAdmin/StatsCards`, `QueueStatus`, `SystemHealth`, `AiUsagePanel` (+`useAiUsage`, `aiUsageFormat`), `SmsUsagePanel` (+`useSmsUsage`), `TagProposals` (+`useTagProposalsAdmin`), `PipelineTrouble`, `DonationsLedger`, `useAdminReport` |
| 18 | החשבון שלי | `/profile` | `pages/profile/ProfilePage.jsx`, `useProfilePageController.js` | `features/Avatar/AvatarEditor.jsx` (+crop, camera), `LanguageSwitcher variant="field"`, `NotificationPreferencesCard.jsx` (+hook; מייל **ו-SMS**), `PhoneCard.jsx` + `PhoneCodeDialog.jsx` (+hook), `RoleRequestCard.jsx` (+hook) |
| 19 | מגירה | (כל דף מחובר) | `layout/navbar/Navbar.jsx` | `layout/navbar/UserDrawer.jsx` |
| 20–24 | פריט שמע (סיכום/פרקים/תמלול/הערות/דיון) | `/media/:id` | `pages/mediaView/MediaViewPage.jsx`, `useMediaViewPageController.js`, `useMediaInsights.js`, `useMediaLike.js`, `useMediaSave.js`, `useLessonNotebook.js`, `useAIDiscussionController.js`, `useAiTagSuggestions.js`, `useCourseTrackForLesson.js`, `usePublicLink.js` | `features/MediaPlayer/MediaPlayer.jsx` + `PlayerControls.jsx` + `stageGeometry.js` + `useMediaSession.js`; `componentsMediaView/MediaInsightsTabs.jsx` → `AISummaryPanel`, `AiTagSuggestions`, `ChaptersPanel`, `FollowAlongTranscript`, `features/TranscriptEditor/*`, `NotesPanel` (+`useNotesPanel`), `SessionChatPanel`, `AIDiscussion/AIDiscussionPanel` (`SmartSearchPane`, `HistoryPane`, `ChatPane`); `MediaActionsBar.jsx` (`SaveMenu`, `ShareDialog`, `features/DownloadMenu`); `CourseTrackBar.jsx`; `LessonNotebook.jsx` |
| 26 | פריט וידאו | `/media/:id` | כמו 20 | כמו 20; `MediaPlayer` עם stage שחור 16:9 |
| 27 | פריט ספר | `/media/:id` (`isText`) | כמו 20 | `componentsMediaView/TextViewer.jsx` → `PdfViewer.jsx` (+`PdfPage`, `PdfToolbar`, `usePdf*`, `pdfLayout.js`) או iframe ל-DOCX; `TextQualityNotice.jsx`; קישור "פתיחה בכרטיסייה חדשה" (`textViewer.newTab`) |
| — | שיעור לאורח (אין מוקאפ) | `/l/:id` (בלי Navbar) | `pages/guest/GuestLessonPage.jsx` + controller | header משלו, `<audio controls>` / `<video controls>` נייטיב |

**Shell משותף:** `src/App.jsx` (ThemeProvider, `ColorModeContext`, `PageTransition`, `AUTH_PATHS`, `isGuestPath`, routes), `layout/navbar/*`, `layout/personalShelves.js`, `layout/LanguageSwitcher.jsx`, `layout/useAccountLanguage.js`, `features/Notification/GlobalSnackbar.jsx`, `features/Avatar/WelcomeAvatarDialog.jsx`.

---

## 2. המצב היום

### Theme
- `src/theme/theme.js` → `buildTheme(mode, direction = "rtl")`. נבנה ב-`App.jsx` ב-`useMemo([mode, direction])`.
- `PALETTES.light`: primary `#1a4a66` (navy), secondary `#17a2c4` (teal), palette מותאם `personal` `#7e57c2` (סגול, שמירה), `background.default` `#f3f5f7`. `PALETTES.dark`: primary `#5fb0cf`, secondary `#29b6d8`, personal `#b39ddb`, bg `#0f1417`, paper `#1a2228`.
- Overrides קיימים (חייבים להישמר): `MuiButton` (`disableElevation` + margins לוגיים לאייקונים, כי אין flip), `MuiCssBaseline` (scrollbars לפי mode), `MuiPopover`/`MuiMenu` `disableScrollLock`.
- **אין** `typography`, `shape`, `shadows`, ואין variants מותאמים.
- `AuthLayout.jsx` בונה theme בהיר נפרד לכל כיוון (`lightThemeFor`) – דפי auth תמיד בהירים.
- צבעים hardcoded מחוץ ל-theme: `layout/navbar/navStyles.js` (gradient הבר, `NAV_HOVER/ACTIVE`), `MediaCard.jsx`, `PlayerControls.jsx` (gradient), `ArchiveGreeting.jsx` (gradient), `utilities/constant.js` `mediaTypeAccents` (וידאו כתום, שמע כחול, טקסט ירוק – גם ב-`MediaPlayer.test`), `AuthLayout.jsx`, `layout/personalShelves.js` (`LIKE_COLOUR = "success.main"`, `SAVE_COLOUR = "personal.main"`).

### RTL
- **אין `stylis-plugin-rtl` ואין emotion cache.** `theme.direction` מגיע מ-`useLanguage()`; `src/i18n/i18n.js` מעדכן `<html dir lang>` ו-`document.title`.
- המשמעות: מאפיינים פיזיים ב-`sx` **לא מתהפכים**. כל צד נכתב לוגית (`marginInlineStart`, `insetInlineEnd`, `textAlign: "start"`). ESLint אוכף (גם `ms/me/ps/pe`), ו-`src/directionLint.test.js` בודק שהכלל פעיל. חריג נקודתי: `// eslint-disable-next-line no-restricted-syntax -- centring` (ל-`left: 50%` של מרכוז).
- צד של drawer/menu: `useDirection()` (`src/i18n/useDirection.js`) → `{ start, end, rtl }`, ו-`menuOrigins(side, grow)`. חצים: `features/DirectionalIcon`. ב-Drawer כיוון ה-Slide נקבע ידנית (`direction: end === "left" ? "right" : "left"`).
- **המשמעות למוקאפ:** כל `right-*`/`left-*`/`pr`/`pl` ב-HTML מתורגם לצד לוגי. ב-RTL "ימין" = start.

### Dark mode
- `App.jsx`: `useState(readColorMode)` ← `localStorage["colorMode"] === "dark"`, ברירת מחדל `light`; שמירה ב-`saveColorMode` (try/catch). `ColorModeContext` (`src/theme/colorMode.js`) = `{ mode, toggle }`.
- המתג היום: `IconButton` עם `Brightness4/7` ב-`Navbar.jsx` (תוויות `nav:colorMode.toLight/toDark/toggle`). `nav:colorMode.toDark` = "מצב כהה" כבר קיים בכל השפות.

### Header / ניווט / תמונות
- `layout/navbar/Navbar.jsx`: `AppBar` sticky, `BAR_HEIGHT = 64` (`navStyles.js`), gradient `barSurfaceSx`. בתוכו: שם (`common:appName`, link ל-`/archive`), `NavLinksBar` (md+: כפתור "תוכן אישי" ▾ + קישורי התפקיד), `PersonalMenu` (5 המדפים כפס טאבים), `NotificationBell` (+`useNotificationBell`, polling, `pendingRoleRequests`), `LanguageSwitcher` (md+), מתג צבע, אווטאר+שם → `/profile` (md+), אווטאר קטן (xs), המבורגר (**בכל רוחב**) → `UserDrawer`.
- `layout/navbar/navLinks.js` → `getLinksByRole(role)`: תלמיד = ארכיון, שאל, הקורסים שלי, מפגשים, תרומה; מרצה + ניהול קורסים (`/courses`); מנהל + משתמשים (`/users`) + ניהול (`/admin`). `NavLinkLabel.jsx` מוסיף pill ספירת בקשות תפקיד ל"משתמשים".
- `layout/personalShelves.js`: `PERSONAL_SHELVES = [continue, notebook, likes, saved, downloads]` עם path, `labelKey` (`nav:shelves.*`), Icon, `iconColour`. **מקור ה-routes של App** – נשאר מקור האמת.
- `UserDrawer.jsx`: anchor = `end` (**שמאל ב-RTL**), מתחת לבר, בלי backdrop, רוחב `20.4vw` (md) / `min(85vw,320px)` (xs). תוכן: אווטאר, שם, אימייל, תפקיד, מדפים אישיים, קישורי תפקיד, `LanguageSwitcher variant="list"`, התקנה (`useInstallPrompt`, רק כש-`installer.offer`), התנתקות. `InstallHelpDialog.jsx` (iOS).
- `PendingRoleBanner.jsx` מתחת לבר. App מסתיר Navbar+Banner ב-`AUTH_PATHS` וב-`/l/*`.
- `PageTransition` ב-`App.jsx`: אנימציית slide+blur בכל ניווט (אין כיבוד `prefers-reduced-motion`).
- תמונות: `ArchivePage.jsx` – עמודת צד `/images/central_image.png` (24%, sticky, opacity .5, md+). `AuthLayout.jsx` – `/images/entry_image.png` + gradients בז׳ + כרטיס זכוכית + notch. `public/images/{audio,book,download,video}_image.png` – **אין להם שום הפניה בקוד** (שאריות).
- גבהים hardcoded של 64: `ArchivePage`, `CourseTrackPage`, `MyCoursesPage`, `CreatorPage`, `DownloadsPage`, `NotebookPage` (`NAVBAR_HEIGHT`), `CollectionPage`, `PlaylistPage`, `ProfilePage`, `SessionRoom`.

### כרטיס המדיה
- `features/MediaGrid/MediaGrid.jsx`: CSS grid (1/2/3 עמודות, `gap: 3`) – **בכוונה לא MUI Grid** (שוליים שליליים בצד הלא נכון בלי flip; נבדק ב-`a11yReview.test.jsx`). skeletons, empty (`NoDataDialog`), "טען עוד" + `useLoadMoreTrigger`.
- `features/MediaGrid/MediaCard.jsx` – פעולות ומי רואה:

| פעולה / אלמנט | מי רואה | תנאי בקוד |
|---|---|---|
| הורדה (פותח `DownloadMenu`: קובץ, MP3/שמע, PDF תמלול אם `has_transcript`) | **כולם** | תמיד |
| פרסום/הסתרה (`card.publish` / `card.hide`) | מנהל; מרצה על פריט שהעלה | `canManageMedia(user,item)`; **בלי בדיקה ש-`onTogglePublish` הועבר** |
| עריכת פרטים (`EditMediaDialog`) | כנ"ל | `canManage && onEditDetails` |
| עריכת תגיות (`EditTagsDialog`) | כנ"ל | `canManage && onEditTags` |
| מחיקה (+ `ConfirmingDeletionDialog`) | כנ"ל | `canManageMedia`; **בלי בדיקה ש-`onDelete` הועבר** |
| badge "טיוטה" / "ציבורי" | מנהלי הפריט | `canManage && !is_published` / `&& is_public` |
| צ׳יפ סוג, צ׳יפ קורס, צ׳יפ יוצר (לחיץ → דף יוצר אם `onOpenCreator` ו-`hasCreatorPage`), צ׳יפ אורך, מונה לייקים, תגיות, תיאור | כולם | לפי נתונים |
| תצוגה מקדימה של וידאו ב-hover | כולם | `media_type === "video"` |
| לחיצה על הכרטיס → `/media/:id` | כולם | `onView` |

- **אין כפתור לייק על הכרטיס היום.** "אהבתי" קיים רק ב-`MediaActionsBar` דרך `pages/mediaView/useMediaLike.js` (`selectLikedIds` + `fetchLikedIds` לכל mount).
- **באג קיים:** `CollectionPage`/`PlaylistPage`/`PlaylistsSection` לא מעבירים `onDelete`/`onTogglePublish`, אבל מנהל עדיין רואה שם את כפתורי הפרסום והמחיקה, שזורקים `TypeError` בלחיצה. ר׳ D-14.

### הבחנה בין מנהל למשתמש היום
- `src/utilities/permissions.js` (מראה של השרת): `isPrivileged(user)` (מרצה או מנהל), `canManageMedia(user,item)`, `canManageCourse(user,course)`. `ProtectedRoute allowedRoles`. `getLinksByRole`.
- **אין שום מושג של "מצב תצוגה"** – מה שמותר מוצג תמיד. "תצוגת מנהל" (חלק ג׳ 2) היא state חדש לגמרי.

### טאבים בעמוד פריט היום (`MediaInsightsTabs.jsx`)
- שמע / וידאו: סיכום · פרקים · תמלול · הערות אישיות · **[צ׳אט המפגש – רק כש-`media.session_id`]** · דיון עם AI.
- ספר (`isText`): סיכום · הערות אישיות · דיון עם AI. ← **תואם להחלטה 9**, חוץ מטאב צ׳אט המפגש שלא במוקאפ (D-20).
- בטאב תמלול: `ToggleButtonGroup` "עם הנגינה / טקסט מלא (ועריכה)" כשיש `captions`, `FollowAlongTranscript`, `TranscriptEditor` (עריכה, תיקון עברית, הפקת סיכום מחדש לשמע).
- בטאב סיכום: `AISummaryPanel` (נקודות מפתח, תגיות השיעור, "הפקת סיכום" לספר בלבד עם `canEditTranscript && isText`, polling stalled + retry), ומתחתיו `AiTagSuggestions` (רק `canEditTranscript && ai_summary`).

### נגן
- **אין היום נגן נייטיב בעמוד הפריט.** `MediaPlayer.jsx` = `ReactPlayer` עם `controls={false}`, ולשמע `forceAudio` → `<audio>` מוסתר בגודל 1×1. ה-UI הוא `PlayerControls.jsx` מותאם (play/pause, scrub, זמנים, mute+volume, כתוביות, תפריט הגדרות: מהירות + הורדות), שיושב **באמצע stage ריק של 16:9** גם לשמע – זה "הנגן שמרחף באמצע הדף" במפרט.
- סביבו: `seekOnReady` (חזרה למיקום), `onProgress` (שמירת מיקום), `seekTo` דרך ref (פרקים, תמלול, הערות, מחברת, דיון), `useMediaSession` (מסך נעילה), כתוביות (`captionsOn` ב-localStorage), גובה פאנל הטאבים נמדד מה-stage (`panelHeight` ב-`MediaViewPage`).
- נגנים נייטיב קיימים רק ב-`GuestLessonPage` וב-`OfflinePlayer` (דף ההורדות).

### שם האתר
- מפתח: **`common:appName`** (`src/locales/<lng>/common.json`): he "פלטפורמת הקהילה", yi "קהילה־פּלאַטפֿאָרמע", en "Community Platform", fr "Plateforme communautaire", es "Plataforma comunitaria".
- שימושים: `Navbar.jsx`, `GuestLessonPage.jsx`, `useMediaSession.js` (album), `i18n.js` (`document.title`). סטטי בעברית: `index.html` (`<title>`, `apple-mobile-web-app-title`), `public/manifest.webmanifest` (`name`, `short_name`).
- **תלות נסתרת:** `scripts/check-locale-chunks.mjs` (חלק מ-`npm run verify`) מזהה כל שפה ב-bundle לפי ה-`appName` שלה. שם מותג זהה בכמה שפות ישבור את `verify` (D-26). גם `src/i18n/i18n.test.jsx` ו-`useMediaSession.test.js` בודקים את הערכים.
- בשרת יש `appName` משלו (`community-platform-server/locales/*.json`, מיילים ודף שיתוף) – ריפו אחר, מחוץ להיקף.

### פונטים
- **אין טעינת פונט היום.** אין `@fontsource`, אין Google Fonts. MUI נופל ל-Roboto שלא נטען → Helvetica/Arial. `AuthLayout` ו-`ErrorBoundary` משתמשים ב-`system-ui`. `src/assets/fonts/NotoSansHebrew-Regular.ttf` משמש רק את jsPDF (`utilities/hebrewPdf.js`).

### רכיבים קיימים שהמפרט מתאר בשם אחר
- `features/SearchBar/SearchBar.jsx` = "שדה חיפוש" (קומפוננטה 8). משמש ב-`FilterBar`, `UsersHeader`, ונבדק ב-`a11yReview.test.jsx`.
- `features/NoDataDialog/NoDataDialog.jsx` = מצב ריק היום (אייקון Inbox + טקסט + CTA אופציונלי). משמש ב-`MediaGrid`, `MyCoursesPage`, `SessionsPage`, `CoursesPage`.
- `features/ConfirmingDeletionDialog`, `features/Dialogs/{DialogTitle,DialogContent,DialogActions}` – דיאלוגים משותפים.

---

## 3. קומפוננטות משותפות ליצירה (חלק ג׳) ומיקומן

כללי מיקום (CLAUDE.md): רכיב שמשמש יותר ממסך אחד ← `features/<Name>/`, הוק לידו. `layout/` = המעטפת. `src/utilities/` = פונקציות טהורות שלא מייבאות דבר מ-components/store/api. בריפו אין תיקיית `ui`; הקונבנציה היא תיקייה לכל רכיב תחת `features/`, וכך גם כאן.

| # | רכיב | נתיב מוצע | שלב | הערות |
|---|---|---|---|---|
| — | טוקנים | `src/theme/tokens.js` (light/dark, radii, shadows, motion) + `src/theme/theme.js` | 1 | `buildTheme(mode, direction)` נשאר החתימה. `palette.personal` נשמר (D-25) |
| 6 | כפתורים | `theme.js` → `MuiButton.variants` (`soft`, `dark`, `tinted-success`) | 1 | בלי רכיב. לשמור את ה-margins הלוגיים הקיימים |
| 10, 11, 12 | Tabs, Switch, Paper/Card, Menu, Tooltip, Chip, InputBase/Select | `theme.js` components | 1 | |
| 7 | `AppTextField` | `features/AppTextField/AppTextField.jsx` | 1 | **ההחלה על השדות הקיימים דרך ה-theme**, לא החלפה גורפת (D-28) |
| 8 | שדה חיפוש | `features/SearchBar/SearchBar.jsx` (עיצוב מחדש, אותו שם) | 1 | לא רכיב שני (D-29) |
| 9 | `SegmentedControl` | `features/SegmentedControl/SegmentedControl.jsx` | 1 | פריטים כ-`button` עם `aria-pressed` – ה-e2e של ההרשמה מוצא את התפקיד לפי `role=button` ושם |
| 9 | `StatusBadge` | `features/StatusBadge/StatusBadge.jsx` | 1 | tones: indigo, neutral, success, warning, error |
| 12 | `SectionCard` | `features/SectionCard/SectionCard.jsx` | 1 | |
| 13 | `PageHeader` | `features/PageHeader/PageHeader.jsx` | 1 | kicker / H1 display / subtitle / actions |
| 14 | `EmptyState` | `features/EmptyState/EmptyState.jsx`; `NoDataDialog` הופך לעטיפה דקה מעליו | 1 | כל הקוראים הקיימים מקבלים את העיצוב בלי שינוי (D-30) |
| 16 | `BackLink` | `features/BackLink/BackLink.jsx` | 1 | משתמש ב-`DirectionalIcon toward="back"` |
| 1 | `AppHeader` (+ `variant="minimal"`) | `layout/navbar/AppHeader.jsx` (מחליף את `Navbar.jsx`) | 2 | minimal מוצג ע"י `AuthLayout` (D-11) |
| 2 | `AvatarMenu` | `layout/navbar/AvatarMenu.jsx` | 2 | מחליף את `PersonalMenu.jsx` ואת כפתור "תוכן אישי" |
| 3 | `NavDrawer` | `layout/navbar/NavDrawer.jsx` | 2 | מחליף את `UserDrawer.jsx` |
| 4 | `Dock` | `layout/navbar/Dock.jsx` | 2 | |
| — | `navConfig` | `layout/navConfig.js` | 2 | מורכב מ-`navLinks.js` + `personalShelves.js` (D-06). `personalShelves.js` נשאר מקור ה-routes |
| — | תצוגת מנהל | `layout/adminView.js` (context + read/save ל-localStorage) + `layout/useAdminView.js` | 2 | provider ב-`App.jsx` כמו `ColorModeContext` (D-07) |
| — | גבהי מעטפת | `layout/shellGeometry.js` (`HEADER_HEIGHT = 48`, `DOCK_CLEARANCE = 160`) | 2 | מחליף את `BAR_HEIGHT` ואת ה-64 הפזורים |
| — | `PageContainer` | `layout/PageContainer.jsx` + `layout/pageWidth.js` (route → `wide`/`narrow`/`full`) | 2 | D-13 |
| 5 | `CoverArt` | `features/MediaTile/CoverArt.jsx` + `src/utilities/coverArt.js` (פלטות `P`, גיאומטריה, `paletteKeyFor(id)`) | 3א | ה-utility טהור ונבדק בנפרד. `useId()` ל-id של ה-gradient |
| 5 | `MediaTile` | `features/MediaTile/MediaTile.jsx` | 3א | מחליף את `MediaCard.jsx`. `MediaGrid.jsx` נשאר (2/3/4 עמודות) |
| 5 | תפריט ⋯ | `features/MediaTile/MediaTileMenu.jsx` + `useMediaTileMenu.js` | 3א | מארח את `DownloadMenu` הקיים |
| 5 | לייק בגריד | `features/MediaTile/useTileLikes.js` | 3א | `fetchLikedIds` פעם אחת לגריד, לא לכל אריח (D-18) |
| — | Hero בארכיון | `pages/archive/componentsArchive/ArchiveHero.jsx` + `pages/archive/featuredItem.js` (טהור) | 3א | D-01 |
| — | Toolbar בארכיון | `pages/archive/componentsArchive/ArchiveToolbar.jsx` (צ׳יפי סוג, חיפוש, מיון, צ׳יפ סינון); `FilterBar.jsx` מצטמצם לפאנל | 3א | |
| — | כרטיס נגן שמע | `features/MediaPlayer/` – `MediaPlayer` מקבל layout של כרטיס לשמע (D-21) | 4א | אותו רכיב ואותה לוגיקה |
| — | layout עמוד פריט | `pages/mediaView/componentsMediaView/LessonHeader.jsx` (kicker, badge, H1, מרצה) + CSS grid 5/7 | 4א | לא MUI Grid (אותה בעיית RTL) |

---

## 4. פעולות שקיימות היום ואינן במוקאפים – ולאן הן עוברות

### מעטפת
| פעולה היום | איפה היום | לאן |
|---|---|---|
| "תוכן אישי ▾" (5 מדפים) | `NavLinksBar` + `PersonalMenu` | קבוצה ראשונה ב-`AvatarMenu` וב-`NavDrawer`, + "החשבון שלי" |
| ניהול קורסים / משתמשים / ניהול בבר | `navLinks.js` | קבוצת "ניהול" ב-`AvatarMenu`/`NavDrawer`, מאחורי מתג תצוגת מנהל |
| pill ספירת בקשות תפקיד על "משתמשים" | `NavLinkLabel.jsx` | אותו pill על הפריט בתפריט ובמגירה + נקודה על כפתור האווטאר כשיש בקשות (D-08) |
| גלובוס שפה | בר (md+), מגירה, דפי auth | "שפת האתר" בתפריט ובמגירה (פותח את `LanguageMenu` הקיים); בדפי auth – בתוך header מינימלי |
| מתג בהיר/כהה | בר | מתג "מצב כהה" בתפריט ובמגירה |
| התקנת האפליקציה + עזרה ל-iOS | מגירה | "הטמעה/התקנה" בתפריט ובמגירה, רק כש-`installer.offer` (כמו היום) |
| אווטאר → `/profile` | בר | כותרת התפריט + "החשבון שלי" |
| `PendingRoleBanner` | מתחת לבר | נשאר מתחת ל-header |
| "העלאת מדיה" | רק בארכיון | נשאר בארכיון + פריט בקבוצת "ניהול" (D-09) |

### ארכיון ואריח
| פעולה היום | לאן |
|---|---|
| מסנן יוצר, אורך, תאריכים, תגיות (drilldown, נבחרות, ניקוי), "ניקוי הכל" | פאנל הסינון (29) |
| טוגל סוג (בתוך הפאנל היום) | צ׳יפים ב-toolbar, multi-select כמו היום (D-03) |
| מיון | צ׳יפ מיון ב-toolbar (תפריט) |
| "טען עוד" / גלילה אינסופית | נשאר מתחת לגריד |
| CTA העלאה במצב ריק | כפתור ה-`EmptyState`, מאחורי תצוגת מנהל |
| הורדה / פרסום-הסתרה / עריכה / תגיות / מחיקה | תפריט ⋯ בסדר: הורדה · עריכה · תגיות · הסתרה/הצגה · מפריד · מחיקה |
| tooltips "פורסם / טיוטה" על כפתור הפרסום | טקסט משני בפריט התפריט (`card.publishedHint` / `draftHint`) |
| צ׳יפ יוצר לחיץ → דף יוצר | שורת המרצה באריח, לחיצה (כש-`onOpenCreator` ו-`hasCreatorPage`) |
| צ׳יפ אורך | ב-kicker: "{סוג} · {משך}" |
| badge "ציבורי" | badge באותו מקום ובאותו סגנון של "טיוטה" (D-17) |
| תצוגה מקדימה של וידאו ב-hover | נשאר מעל ה-CoverArt, בדסקטופ |
| צ׳יפ קורס, תיאור, מונה לייקים, כל התגיות | ר׳ D-17 |

### עמוד פריט
| פעולה היום | לאן |
|---|---|
| לייק, שמירה + תפריט רשימות (`SaveMenu`), הורדה (`DownloadMenu`), שיתוף (`ShareDialog` כולל קישור ציבורי) | שורת הפעולות בתחתית כרטיס הטאבים (20), בכל שלושת הסוגים |
| עוצמה / השתקה, מהירות, כתוביות, תפריט הגדרות (הורדות) של הנגן | שורה קומפקטית של כפתורי אייקון בכרטיס הנגן (D-21) |
| `CourseTrackBar` (מקום בקורס, השיעור הבא) | מתחת לכרטיס הנגן (שמע) / מתחת לווידאו |
| תאריך "פורסם / טיוטה, הועלה" | שורת המטא מתחת לגריד (כמו במוקאפ) |
| תיאור | מתחת לגריד |
| `AiTagSuggestions` (אישור/דחייה לכל תגית ולכולן, "הצעת תגיות") | קופסת `fill-2` בטאב הסיכום |
| הפקת סיכום (ספר), "בדוק שוב" ב-polling שנעצר | כפתור soft קטן בתחתית טאב הסיכום |
| כותרות משנה: הפקה / הפקה מחדש | טאב פרקים, primary עם ניצוץ |
| `TranscriptEditor` (עריכה, תיקון עברית, הפקת סיכום מחדש לשמע) | טאב תמלול, מצב "טקסט מלא ועריכה" |
| רשימת סימניות/הערות, עריכה, מחיקה | טאב הערות, מתחת לשדה ו"שמור" |
| טאב צ׳אט המפגש | נשאר כטאב, לפני "דיון עם AI" (D-20) |
| חיפוש חכם / צ׳אט / היסטוריה | segmented של 3 מצבים (24) |
| מחברת לשיעור: הערה חדשה, לכל המחברת, מחיקה | כרטיס "המחברת שלי לשיעור זה" מתחת לגריד |
| PDF: זום, התאמה, עמוד קודם/הבא, מספר עמוד, סימון קטע (סימניית מלבן), `TextQualityNotice`, iframe ל-DOCX | בתוך מיכל המציג (27) |
| "פתיחה בכרטיסייה חדשה" | קישור 13px accent מתחת למציג |

### דפים אחרים
| דף | פעולה שאינה במוקאפ | לאן |
|---|---|---|
| שמורים | חץ "עוד 3", "לרשימה המלאה", דף רשימה בודדת | שורה מתקפלת → גריד; "לרשימה המלאה" נשאר כקישור כשיש יותר ממה שהגיע; `PlaylistPage` נשאר ומעוצב כמו 07 עם `BackLink` (D-36) |
| הורדות | ביטול הורדה, ניגון offline, מעבר לשיעור, הסרה, "מחק הכל", שורת אחסון, ניסיון חוזר | רשימה בכרטיס בסגנון החדש מעל/במקום ה-EmptyState |
| מחברת | ייצוא (מקורות, פיצול), צבעי הדגשה, דיאלוג הערה ללא כותרת, חלון מקור צף, מחיקה מרובה | נשארים, בעיצוב החדש |
| שאל את הארכיון | (הכל במוקאפ) | — |
| תרומה | "התרומות שלי", שלב התשלום של Stripe, דף התוצאה | מתחת לכרטיס / באותו כרטיס; תרומה חודשית נשארת disabled עם tooltip (D-38) |
| החשבון שלי | `PhoneCard`, `RoleRequestCard`, מתגי SMS | כרטיסים נוספים באותו סגנון; שתי עמודות מתגים (מייל / SMS) (D-39) |
| הקורסים שלי | בקשות הצטרפות ממתינות + ביטול | כרטיס מעל ה-EmptyState/הרשימה |
| מפגשים | מפגשים פעילים (הצטרפות), עתידיים (פתיחה, הוספה ליומן), דיאלוג יצירה | כרטיסים בסגנון החדש (D-42) |
| ניהול קורסים | מתג "כל הקורסים / שלי" (מרצה), ייצוא CSV, הסרת תלמיד, `MyStudents`, בקשות הצטרפות | `SegmentedControl` בפעולות ה-PageHeader; השאר בכרטיס המורחב (D-10) |
| דף קורס | גרירה לסידור (מרצה), `CourseReport` | נשארים בכרטיסים |
| משתמשים | `PendingApprovals` (אישור, דחייה עם סיבה), טלפון מוסתר, הפעלה/השבתה | כרטיס "ממתינים לאישור" מעל הטבלה; פעולות כאייקונים עגולים (D-41) |
| לוח בקרה | `SmsUsagePanel`, "הרצת סנכרון", "הרצה מחדש" | `SmsUsagePanel` ככרטיס ליד "עלות AI" (D-40) |
| אורח / חדר מפגש / תוצאת תרומה / איפוס-אימות-הסרה | אין מוקאפ | theme בלבד + header/container (D-43) |

---

## 5. לכל שלב: קבצים שייגעו בהם, ובדיקות שצפויות להישבר

בכל שלב רצים גם `src/imports.test.js`, `src/directionLint.test.js`, `src/literalLint.test.js`, `src/locales/localeParity.test.js` – הם לא נשברים מעיצוב, אבל יתפסו `ms`/`me`, טקסט ב-JSX, `react-redux` ב-`.jsx` ומפתח שחסר בשפה.

### שלב 1 – theme, tokens, פונטים, רכיבי בסיס
- **קבצים:** `src/theme/theme.js`, `src/theme/tokens.js` (חדש), `src/main.jsx` (ייבוא `@fontsource/*`), `package.json` (dependencies בלבד, בלי scripts → בלי עדכון סקיל), `src/App.jsx` (`prefers-reduced-motion` ל-`PageTransition`), `features/{AppTextField,SegmentedControl,StatusBadge,SectionCard,PageHeader,EmptyState,BackLink}/*` (חדשים), `features/SearchBar/SearchBar.jsx`, `features/NoDataDialog/NoDataDialog.jsx`, `pages/auth/AuthLayout.jsx` (רק `fontFamily: system-ui` → מהטמה), `features/ErrorBoundary/ErrorBoundary.jsx` (לא חובה), locales אם רכיבי הבסיס צריכים תוויות (EmptyState לא).
- **בדיקות שעלולות להישבר:** `src/components/a11yReview.test.jsx` (SearchBar עם שם מה-placeholder), `MediaGrid`/`NoDataDialog` בבדיקות שמחפשות טקסט ה-empty (`DownloadsPage.test`, `CoursesPage.test`, `PlaylistsSection*.test`) אם המבנה משתנה. בדיקות שמשתמשות ב-`getByLabel` על `TextField` – רק אם ה-override שובר את קשר `<label for>` (אסור לו). e2e: לא אמור להישבר.

### שלב 2 – מעטפת
- **קבצים:** `src/App.jsx` (provider של תצוגת מנהל, `PageContainer`, Dock, הסרת תמונות, מתג צבע עובר), `layout/navConfig.js`, `layout/adminView.js`, `layout/useAdminView.js`, `layout/shellGeometry.js`, `layout/PageContainer.jsx`, `layout/pageWidth.js` (חדשים); `layout/navbar/AppHeader.jsx`, `AvatarMenu.jsx`, `NavDrawer.jsx`, `Dock.jsx` (חדשים); מחיקה/צמצום: `Navbar.jsx`, `NavLinksBar.jsx`, `PersonalMenu.jsx`, `UserDrawer.jsx`, `navStyles.js`; `NavLinkLabel.jsx`, `navLinks.js`, `layout/personalShelves.js` (רק אם `iconColour` משתנה), `layout/LanguageSwitcher.jsx` (variant לתפריט), `pages/auth/AuthLayout.jsx` (header מינימלי, בלי תמונת רקע – הכרטיס עצמו בשלב 5א), `pages/archive/ArchivePage.jsx` (הסרת תמונת הצד בלבד), כל הדפים עם `calc(100vh - 64px)` (רשימה בסעיף 2), `src/locales/*/nav.json` + `common.json` (appName, "מצב כהה", "תצוגת מנהל", "שפת האתר", "הטמעה/התקנה", dock), `scripts/check-locale-chunks.mjs` (מזהה שפה חדש, D-26), `index.html`, `public/manifest.webmanifest`, `public/images/central_image.png` + `entry_image.png` (מחיקה כשלא בשימוש; ארבעת השאר כבר יתומים).
- **בדיקות שצפויות להישבר:** `layout/navbar/Navbar.test.jsx` (כל ה-describe של "the personal-content dropdown", "the drawer on a phone", ואולי "what each role is offered" אם `getLinksByRole` משתנה), `layout/shellKeys.test.js` (אם מבנה הקישורים משתנה), `layout/navbar/accountState.test.jsx` (התנתקות דרך המגירה), `layout/LanguageSwitcher.test.jsx` (אם variant `list` משתנה), `layout/navbar/NotificationBell.test.jsx` (מיקום בלבד – כנראה עובר), `src/i18n/i18n.test.jsx` + `features/MediaPlayer/useMediaSession.test.js` (ערכי `appName`), `pages/archive/ArchivePageUpload.test.jsx` (אם כפתור ההעלאה עובר דרך `useAdminView`). **e2e:** `e2e/language.spec.js` – הגלובוס לא יהיה ב-header אחרי התחברות (צריך לפתוח את תפריט האווטאר), ההמבורגר מוצג רק מתחת ל-md (צריך viewport צר ב-`drawerSide`), וצד המגירה מתהפך (עברית → `right`, אנגלית → `left`; D-05).

### שלב 3א – CoverArt, MediaTile, ⋯, דף הארכיון (02, 03, 29) + סקיל `redesign-screen`
- **קבצים:** `src/utilities/coverArt.js` (+test), `features/MediaTile/{MediaTile,CoverArt,MediaTileMenu}.jsx`, `useMediaTileMenu.js`, `useTileLikes.js` (חדשים); `features/MediaGrid/MediaGrid.jsx` (2/3/4, MediaTile, skeleton מרובע); מחיקת `features/MediaGrid/MediaCard.jsx`; `pages/archive/ArchivePage.jsx`, `componentsArchive/ArchiveBrowser.jsx`, `FilterBar.jsx` (← פאנל), `ArchiveToolbar.jsx` + `ArchiveHero.jsx` (חדשים), `ArchiveGreeting.jsx` (kicker), `featuredItem.js` (חדש), `useArchivePageController.js` (רק אם ה-hero צריך ערך נגזר – עדיף hook נפרד), `TagDrilldown.jsx`/`SelectedTags.jsx` (עיצוב), `features/SmartSearch/SmartSearch.jsx` (שדה גדול), `features/DownloadMenu/DownloadMenu.jsx` (anchor מתפריט), locales `archive.json`/`media.json` (subtitle, hero, "כל הפריטים", ⋯), `.claude/skills/redesign-screen/SKILL.md` (בריפו השורש).
- **בדיקות שצפויות להישבר:** `features/MediaGrid/MediaCard.test.jsx` (נכתב מחדש כ-`MediaTile.test.jsx`: אורך ב-kicker, יוצר לחיץ), `src/components/a11yReview.test.jsx` (עושה `vi.mock("./features/MediaGrid/MediaCard")` עם `data-testid="card"` – ה-mock עובר ל-`MediaTile`), `componentsArchive/FilterBar.test.jsx` (שלוש בדיקות הסוג עוברות ל-toolbar; "a chosen range counts on the filter badge" – הספירה בלי סוג), `ArchivePageUpload.test.jsx`, `useArchivePageController.test.jsx` (אם נוגעים בו), `ArchiveGreeting.test.jsx`, `TagDrilldown.test.jsx`, `SmartSearch.test.jsx`, `DownloadMenu.test.jsx`. **e2e:** `e2e/journey.spec.js` – שלב הפרסום (`rowWith(lessonTitle, button "card.publish")`) צריך לפתוח את ⋯ של האריח ואז `menuitem` בשם `media:card.publish`.

### שלב 3ב – 04, 06, 07/28, 25
- **קבצים:** `pages/personal/CollectionPage.jsx`, `PlaylistPage.jsx`, `PlaylistsSection.jsx`, `usePlaylistsSection.js`, `pages/creators/CreatorPage.jsx`, `creatorSummary.js` (רק אם הטקסט משתנה), locales `personal.json`/`nav.json`/`creators.json` (kicker ספירה, כותרות משנה).
- **בדיקות שצפויות להישבר:** `pages/personal/PlaylistsSection.test.jsx` (16 בדיקות על "שלושה בשורה", חץ "עוד", "לרשימה המלאה" – המבנה המתקפל משנה את רובן), `PlaylistsSectionLoading.test.jsx`, `creators/creatorSummary.test.js` (רק אם הטקסט משתנה). e2e: לא.

### שלב 4א – עמוד שמע ווידאו (20–24, 26) + נגן
- **קבצים:** `pages/mediaView/MediaViewPage.jsx`, `componentsMediaView/LessonHeader.jsx` (חדש), `MediaInsightsTabs.jsx`, `MediaActionsBar.jsx`, `AISummaryPanel.jsx`, `AiTagSuggestions.jsx`, `ChaptersPanel.jsx`, `FollowAlongTranscript.jsx`, `NotesPanel.jsx`, `BookmarkNotePanel.jsx`, `SessionChatPanel.jsx`, `AIDiscussion/{AIDiscussionPanel,SmartSearchPane,HistoryPane}.jsx`, `LessonNotebook.jsx`, `CourseTrackBar.jsx`, `SaveMenu.jsx`, `ShareDialog.jsx`, `SourcePreviewDialog.jsx` (משתמש ב-`MediaInsightsTabs`/`MediaActionsBar`/`MediaPlayer` – חייב להמשיך לעבוד בחלון הצף), `features/MediaPlayer/{MediaPlayer,PlayerControls}.jsx`, `stageGeometry.js`, `features/TranscriptEditor/TranscriptEditor.jsx`, `features/ChatPane/ChatPane.jsx` (משותף עם 09), locales `lesson.json`.
- **בדיקות שצפויות להישבר:** `MediaViewPage.test.jsx` (25: סדר טאבים, תוויות לייק/שמירה, caret הרשימות), `features/MediaPlayer/MediaPlayer.test.jsx` (stage 16:9 לשמע, "bar centred", accents כתום/כחול), `stageGeometry.test.js`, `AISummaryPanel.test.jsx` (נקודות מפתח כרשימה ולא צ׳יפים), `AiTagSuggestions.test.jsx`, `FollowAlongTranscript.test.jsx`, `NotesPanel.test.jsx`, `NotesPanelActions.test.jsx`, `LessonNotebook.test.jsx`, `LessonNotebookEditing.test.jsx`, `AIDiscussion/*.test.jsx`, `SaveMenu.test.jsx`, `SaveMenuLists.test.jsx`, `ShareDialogActions.test.jsx`, `SessionChatPanel.test.jsx`, `SourcePreviewDialogBookmarks.test.jsx`, `features/TranscriptEditor/*.test.jsx`, `features/ChatPane/ChatPane.test.jsx`, `features/DownloadMenu/*.test.jsx`. **e2e:** `journey.spec.js` – heading בשם השיעור, כפתור `lesson:actions.share`, ו-checkbox הקישור הציבורי; דף האורח בודק `audio` – לא נוגעים בו.

### שלב 4ב – עמוד ספר (27)
- **קבצים:** `MediaViewPage.jsx` (ענף `isText`), `componentsMediaView/TextViewer.jsx`, `PdfViewer.jsx`, `PdfPage.jsx`, `PdfToolbar.jsx`, `TextQualityNotice.jsx`, `AISummaryPanel.jsx` (כפתור הפקה מחדש בתחתית), locales `lesson.json`.
- **בדיקות שצפויות להישבר:** `TextViewer.test.jsx`, `PdfViewer.test.jsx`, `PdfToolbar.test.jsx`, `TextQualityNotice.test.jsx`, `MediaViewPage.test.jsx` (מקרי ספר), `SourcePreviewDialogBookmarks.test.jsx`.

### שלב 5א – 01, 30, 31 (+ איפוס, אימות, הסרה מרשימה)
- **קבצים:** `pages/auth/AuthLayout.jsx`, `SignIn.jsx`, `SignUp.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `VerifyEmail.jsx`, `Unsubscribe.jsx`, `SocialSignIn.jsx`, `authShared.jsx`, `GoogleCallback.jsx` (spinner), locales `auth.json` ("או", `*`).
- **בדיקות שצפויות להישבר:** `authPagesFlow.test.jsx` (20; בעיקר "sign-in offers Google, then Apple, then LinkedIn" ושדות), `ResetPassword.test.jsx`, `Unsubscribe.test.jsx`. **e2e:** `journey.spec.js` + `language.spec.js` – תפקיד ההרשמה נמצא כ-`button` בשם התפקיד, שדות לפי `getByLabel` (כולל `^סיסמה` – לסימון `*` אסור לשבור את ההתאמה מתחילת השם), גלובוס בדף ההתחברות לפי `LanguageIcon`.

### שלב 5ב – 05, 08, 09, 12, 18
- **קבצים:** `pages/notebook/NotebookPage.jsx` + `componentsNotebook/*`, `features/Notes/*`; `pages/downloads/DownloadsPage.jsx`, `OfflinePlayer.jsx`; `pages/askArchive/AskArchivePage.jsx` (+`ChatPane` אם לא הסתיים ב-4א); `pages/donate/{DonatePage,DonateForm,PaymentStep,DonationResult,MyDonations,DonateResultPage}.jsx`; `pages/profile/{ProfilePage,NotificationPreferencesCard,PhoneCard,PhoneCodeDialog,RoleRequestCard}.jsx`, `features/Avatar/AvatarEditor.jsx`; locales בהתאם.
- **בדיקות שצפויות להישבר:** `pages/notebook/Notebook{Editing,ExportFlow,LightList,SourceTrail}.test.jsx`, `ExportSourcesDialog.test.jsx`, `ExportSplitDialog.test.jsx`, `features/Notes/*.test.jsx`, `DownloadsPage.test.jsx`, `AskArchivePage.test.jsx`, `ChatPane.test.jsx`, `DonatePage.test.jsx`, `ProfilePage.test.jsx`, `NotificationPreferencesCard.test.jsx`, `PhoneCard.test.jsx`, `features/Avatar/Avatar.test.jsx`, `layout/navbar/accountState.test.jsx` (RoleRequestCard). **e2e:** `phone.spec.js` – `getByLabel("מספר נייד")`, `getByRole("switch", { name: "מפגשים חיים — ב־SMS" })`, כפתורי "שליחת קוד"/"הסרת המספר", "מאומת".

### שלב 6 – 10, 11, 13, 14, 15
- **קבצים:** `pages/courses/{MyCoursesPage,CoursesPage,CourseTrackPage}.jsx`, `componentsCourses/*`, `pages/sessions/SessionsPage.jsx` (+ `SessionRoom.jsx` רק גובה), locales `courses.json` (`title` → "ניהול קורסים"), `sessions.json`.
- **בדיקות שצפויות להישבר:** `CoursesPage.test.jsx` (מתג all/mine), `CourseJoin.test.jsx`, `CourseTrack.test.jsx`, `courseRosterReport.test.jsx`, `SessionRoom.test.jsx` (רק אם נוגעים). **e2e:** `journey.spec.js` – `courses:newCourse` (`.first()`), `courses:form.name`, `courses:roster.search` + option + `roster.add`, הטקסט `courses:students` (count 1, exact), לחיצה על שם הקורס ב-`/my-courses`, `format:track.progress`, ושורת השיעור כ-`button` בשם השיעור.

### שלב 7 – 16, 17
- **קבצים:** `pages/users/UsersPage.jsx`, `componentsUsers/*`; `pages/admin/AdminDashboard.jsx`, `componentsAdmin/*`; locales `users.json`/`admin.json`.
- **בדיקות שצפויות להישבר:** `AdminDashboard.test.jsx`, `componentsAdmin/adminPanels.test.jsx`, `AiUsagePanel.test.jsx`, `SmsUsagePanel.test.jsx`, `a11yReview.test.jsx` ("each row of the users table names whom its buttons act on"). **e2e:** `journey.spec.js` – אישור מרצה ב-`/users` (`rowWith(email, button "users:pending.approve")`), והאימייל מופיע פעם אחת בדיוק (`toHaveCount(1)`) – אסור להציג אותו פעמיים (למשל גם בכרטיס וגם בטבלה).
