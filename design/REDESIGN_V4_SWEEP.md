# Redesign v4 — read-only sweep

Scope: `src/**/*.{js,jsx}`, excluding `*.test.*`, `src/theme/`, `src/locales/`, `design/`. Read-only; no source edited.

## Summary (most important)

1. **Lint: 0 errors, 1 warning** — `useAdminDashboardController.js:57` (`react-hooks/exhaustive-deps`, missing `load`).
2. **86 hard-coded colour lines.** Most map to tokens by value (`#fff`→`paper`, `#1d1d1f`→`ink`, `#4f46e5`→`accent`, `#e11d48`→`danger`). Old-design leftovers without a token: `#1597bb`/`#1a4a66` (ErrorBoundary, stripeJs), `grey.800/900/950` (VideoRoom, ChatPanel, RecordingControls), and `secondary.main` as "the teal" (SourcePreviewDialog).
3. **Hand-rolled pieces:** 3 page titles not using `PageHeader`, 9 empty states as bare `Typography`, 4 status `Chip`s, 1 `ToggleButtonGroup` (OfflinePlayer). No hand-rolled BackLink, no second media card.
4. **Physical positioning left in sx:** FloatingWindow resize handles (`left`/`right`), RichNoteEditor (3), PdfPage (1). No `ml/mr/pl/pr`, no `textAlign: left/right`.
5. **Card shell repeated in 4+ files** (`bgcolor: background.paper` + border + `borderColor: divider` + `RADIUS.card`) — candidate for `SectionCard`, which already exists and is used 9 times.

---

## 1. Hard-coded colours — 86 lines (hex / rgb / rgba)

Token key: `light`/`dark` names in `src/theme/tokens.js`. "token exists" = same value present there.

| file:line | value | token |
|---|---|---|
| features/Avatar/AvatarCropDialog.jsx:83-84 | rgba(255,255,255,.9), rgba(0,0,0,.55) | no token |
| features/Avatar/AvatarEditor.jsx:36 | #fff | token exists: `paper` (#FFFFFF) |
| features/ErrorBoundary/ErrorBoundary.jsx:24,25,30,34,37,43,44,52,54,62,68 | #f5f7f9, #1a4a66, #ffffff, rgba(0,0,0,.08), #4a6b7d, #1597bb (×3), #ffffff, #fbeaea, #8b2f2f | #ffffff = `paper`; #1597bb = old teal, **no token**; rest no token |
| features/MediaPlayer/MediaPlayer.jsx:382 | rgba(0,0,0,.72) | no token |
| features/MediaPlayer/MediaPlayer.jsx:383 | #fff | token exists: `paper` |
| features/MediaPlayer/PlayerControls.jsx:60,63,64,65,72,73,74,76,79,217,269,289 | #1c1c1e, rgba(233,233,238,.55/.92), rgba(255,255,255,.45), rgba(0,0,0,.28/.30/.4), #ffffff, #dcdcdf, alpha(accent) | no token (player chrome) |
| features/MediaTile/MediaTile.jsx:51,191 | #fff | token exists: `paper` / `TILE.fab` |
| features/Notes/NoteToolbar.jsx:42-58 | #d32f2f, #ed6c02, #2e7d32, #1976d2, #7b1fa2, #fff59d, #c8e6c9, #b3e5fc, #f8bbd0, #ffe0b2 | no token (user highlight palette) |
| features/Notes/NoteToolbar.jsx:105 | #d32f2f | no token |
| features/SmartSearch/SmartSearch.jsx:18 | rgba(79,70,229,.3) | no token (accent at 30%) |
| features/VideoRoom/ParticipantGrid.jsx:21 | rgba(0,0,0,0.5) | no token |
| features/VideoRoom/VideoRoom.jsx:27,28 | rgba(211,47,47,.15/.25) | no token (old red, not `danger` #e11d48) |
| pages/archive/componentsArchive/ArchiveHero.jsx:44,93,99 | #fff, #1d1d1f | `paper`; `ink` (#1d1d1f) |
| pages/auth/AuthLayout.jsx:57 | #fff | token exists: `paper` |
| pages/auth/authShared.jsx:45 | #fff | token exists: `paper` |
| pages/auth/authShared.jsx:66 | #fff (SVG path fill) | token exists: `paper` |
| pages/mediaView/componentsMediaView/PdfPage.jsx:14,16,17 | #fff59d, #ffc400 | `#fff59d` no token (= NoteToolbar yellow); `#ffc400` no token |
| pages/mediaView/componentsMediaView/PdfPage.jsx:60,180 | rgba(0,90,255,.28), rgba(255,179,0,.85) | no token |
| pages/mediaView/componentsMediaView/PdfPage.jsx:150 | #fff | token exists: `paper` |
| pages/mediaView/componentsMediaView/ShareDialog.jsx:49 | #25D366 | no token (WhatsApp brand — keep) |
| pages/mediaView/componentsMediaView/SourcePreviewDialog.jsx:76 | rgba(0,0,0,.28) | no token |
| utilities/avatarImage.js:117 | #ffffff (canvas) | token exists: `paper` |
| utilities/coverArt.js:10-24 | cover palettes; `#4f46e5` (indigo), `#6366f1` (indigo2) | `#4f46e5` = `accent`; `#6366f1` = `accentAlt`; the other ~20 values **no token** (by design: per-cover art) |
| utilities/noteFootnotes.js:227,255,256 | #1565c0 | no token |
| utilities/notesExport.js:150,151,160,161,162,163 | #1565c0, #1976d2, #ef6c00, #2e7d32, #ffffff | no token (export CSS) |
| utilities/stripeJs.js:50 | #1a4a66 (fallback primary) | no token — **old navy** |

Comment-only hits (not literals): `utilities/noteHtml.js:40`, `features/SectionCard/SectionCard.jsx:7`, several `*.test` excluded.

### 1b. Named palette literals (`grey.*`) — 27 lines, no token

Old design's grey steps used directly. `grey.850` / `grey.950` are not MUI defaults (check theme).

- features/Avatar/AvatarCropDialog.jsx:50
- features/Avatar/CameraDialog.jsx:44, 58
- features/UploadMedia/UploadMedia.jsx:33, 39
- features/VideoRoom/ChatPanel.jsx:44, 45, 51, 67, 68, 78, 85, 94, 109, 113
- features/VideoRoom/ParticipantGrid.jsx:13
- features/VideoRoom/RecordingControls.jsx:42, 84, 89
- features/VideoRoom/VideoRoom.jsx:26, 27, 28, 65, 66, 71, 132, 141

Teal via palette name: `pages/mediaView/componentsMediaView/SourcePreviewDialog.jsx:73` (`secondary.main`, commented as "the app's teal") — **old-design leftover**, no token.

---

## 2. Duplicated `sx` (≥4 identical properties, 3+ files)

**Group A — card shell (4 files, 4 identical props: `bgcolor: background.paper`, `border`, `borderColor: divider`, `borderRadius: RADIUS.card`)**
- pages/admin/AdminDashboard.jsx:19 (`CARD_SX`, 6 props)
- pages/admin/componentsAdmin/StatsCards.jsx:20-32 (same 6 props)
- features/Notes/NoteCard.jsx:41-47 (`CARD_SX`)
- features/MediaPlayer/MediaPlayer.jsx:255-262
- Also near-identical Paper recipe (`p: 3` + `RADIUS.card`, no bg/border): pages/courses/componentsCourses/CourseReport.jsx:59, MyStudents.jsx:24, courses/CourseTrackPage.jsx:113, sessions/SessionsPage.jsx:41, courses/MyCoursesPage.jsx:68.
- **Candidate:** `features/SectionCard` (already exists, 9 usages). Move the card shell into it or into a theme variant.

**Group B — 3-prop repeats (below the ≥4 bar, reported for completeness)**
- `display:flex, flexDirection:column, gap:2` — 24 files.
- `display:flex, justifyContent:center, py:8` — 12 files.

---

## 3. Hand-rolled components that should use a shared one

**3a. Page titles not using `PageHeader` — 3**
- pages/guest/GuestLessonPage.jsx:79 — `Typography variant="h4"`
- pages/donate/DonationResult.jsx:15 — `Typography variant="h5"`
- pages/creators/CreatorPage.jsx:49 — `Typography variant="display" component="h1"` (hand-rolled page h1)

(`UsersPage.jsx` has no title of its own; its heading lives in `componentsUsers/UsersHeader`, not checked.)

**3b. Empty states as bare `Typography` instead of `EmptyState` — 9**
- features/VideoRoom/ChatPanel.jsx:52
- features/NotificationBell → layout/navbar/NotificationBell.jsx:69
- pages/archive/componentsArchive/TagDrilldown.jsx:432
- pages/courses/componentsCourses/CourseRoster.jsx:87
- pages/courses/componentsCourses/MyStudents.jsx:36
- pages/courses/CourseTrackPage.jsx:140
- pages/mediaView/componentsMediaView/AIDiscussion/HistoryPane.jsx:197
- pages/mediaView/componentsMediaView/LessonNotebook.jsx:76
- pages/mediaView/componentsMediaView/SessionChatPanel.jsx:39
- pages/personal/PlaylistsSection.jsx:92

Not counted (input hints, not empty lists): TranscriptEditor.jsx:24 placeholder, ExportSplitDialog.jsx:307 drop-zone text.

**3c. BackLink hand-rolled — 0.** No `ArrowBack`/chevron back links outside `BackLink`/`DirectionalIcon`.

**3d. `Chip` used as a status pill (should be `StatusBadge`) — 4**
- pages/donate/MyDonations.jsx:21 (`color={s.color}`, a status)
- pages/mediaView/componentsMediaView/AIDiscussion/HistoryPane.jsx:57 ("current")
- pages/notebook/componentsNotebook/NotesIndex.jsx:159 ("not saved", warning colours)
- features/VideoRoom/RecordingControls.jsx:76 (recording state)

Other `<Chip>` uses are tags or filters (ChatPane, SmartSearch, TagPicker, archive, GuestLessonPage metadata), left as is.

**3e. `ToggleButtonGroup` instead of `SegmentedControl` — 1**
- pages/downloads/OfflinePlayer.jsx:52

(ExportSplitDialog.jsx:241-258 uses two standalone `ToggleButton`s by documented choice.)

**3f. Second media-card implementation outside `MediaGrid` — 0.** `CoverArt` is referenced once outside MediaGrid/MediaTile: pages/mediaView/MediaViewPage.jsx (lesson cover, not checked as a card).

---

## 4. Old-design leftovers

- Background images / side image imported or referenced: **0**.
- Page wrapper `p: 3`: **1** — pages/sessions/SessionRoom.jsx:43 (`Box sx={{ p: 3, maxWidth: 520, mx: "auto" }}`).
- Page background `bgcolor`: **2** — pages/guest/GuestLessonPage.jsx:60 (`minHeight 100vh`, `background.default`, page root); pages/notebook/NotebookPage.jsx:172 (strip behind cards, commented; probably intentional).
- Header height 64 as offset: **1** — layout/navbar/AvatarMenu.jsx:42 (`maxHeight: calc(100vh - 64px)`).
- `Navbar`, `UserDrawer`, `PersonalMenu`, `navLinks` imported anywhere: **0**.

---

## 5. Physical spacing / positioning in sx or styled

`ml`, `mr`, `pl`, `pr`, `marginLeft`, `marginRight`, `paddingLeft`, `paddingRight`, `textAlign: left|right`: **0 hits**.

Physical `left:` / `right:` in sx: **13 lines**
- features/FloatingWindow/FloatingWindow.jsx:37, 38, 39, 40, 41, 42, 43, 44 (resize handles, `left`/`right`)
- features/FloatingWindow/FloatingWindow.jsx:131 (`left: geometry.x`)
- features/Notes/RichNoteEditor.jsx:614, 635, 665 (`left:` in positioned sx)
- pages/mediaView/componentsMediaView/PdfPage.jsx:171 (`left: \`${mark.x*100}%\``)

Not sx, not flagged: RichNoteEditor.jsx:243 (computed rect); sessionRecorder.js:145 (data).

ESLint reported no errors on these; the direction lint evidently does not see objects that are not inline `sx` literals (e.g., the handle array in FloatingWindow).

---

## 6. Accessibility

**6a. Icon-only `IconButton` without `aria-label` — 0 direct.**
Checked 15 sites: all have `aria-label` except two that are labelled by their wrapping MUI `Tooltip` (MUI sets `aria-label` from a string `title`):
- pages/courses/CoursesPage.jsx:146 (Tooltip `t("edit")`)
- pages/courses/CoursesPage.jsx:151 (Tooltip `t("delete")`)

**6b. Toggles without `aria-pressed` / `role="switch"` — 0 hard misses.**
- `aria-pressed`: FilterChip, PlayerControls (×2), MediaTile, NoteToolbar, SegmentedControl, SuggestTagsDialog, DonateForm, MediaActionsBar (×2), NotesIndex.
- `role="switch"`: AvatarMenu.jsx:69, 100; NavDrawer.jsx:156, 192.
- Not verified: `Switch` rows in profile/NotificationPreferencesCard.jsx:81, 93 and mediaView/ShareDialog.jsx:71 (MUI Switch, label-dependent).

**6c. `outline: "none"` / `outline: 0` — 2 hits.**
- features/Notes/RichNoteEditor.jsx:530 — contenteditable; no focus replacement found in its sx. **Needs a check.**
- layout/navbar/Dock.jsx:68 — has a replacement at Dock.jsx:75 (`&:focus-visible .dock-icon` outline). OK.

**6d. Animations / transitions outside the theme.**
- Inline `transition:` / `animation:` / `@keyframes` lines: about 30 (features/MediaTile, FilterChip, FloatingWindow, MediaPlayer, Notes, SegmentedControl, SmartSearch, VideoRoom, layout/navbar, pages/*). Keyframes: App.jsx:85-87 (`pageSlide`), MediaTile.jsx:59-60 (`tile-heart-pop`), RecordingControls.jsx:81 (`rec-pulse`, infinite).
- `prefers-reduced-motion`: explicit only in MediaTile.jsx:61. The global guard in `src/theme/theme.js:94-104` (`*, *::before, *::after` with `!important` durations) covers all of the above. **No per-file guard missing in practice**, but it depends on the theme being loaded.

---

## 7. Lint (`npm run lint` in community-platform-client)

- **0 errors, 1 warning.**
- `src/components/pages/admin/useAdminDashboardController.js:57:6` — `react-hooks/exhaustive-deps`: missing dependency `load`.
- Also printed: Node `MODULE_TYPELESS_PACKAGE_JSON` notice for `eslint.config.js` (not a lint finding; add `"type": "module"` to package.json to silence).
