import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAllMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { deleteMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaDelete";
import { updateMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPut";
import { selectAllMedia, selectMediaStatus } from "../../../store/selectors/mediaSelectors";
import { useDebounced } from "../../../utilities/useDebounced";
import { openUpload } from "../../../store/slicesAndThunks/uiSlice";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { mediaApi } from "../../../api/mediaApi";
import { readFilters, writeFilters } from "./archiveFilterParams";
import {
  buildTagRelations,
  normalizeSelection,
  cycleTagDecision,
  forgetTag,
  pruneUnknownTags,
  sameSelection,
} from "./componentsArchive/tagStates";

const useArchivePageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const allMedia = useSelector(selectAllMedia);
  const status = useSelector(selectMediaStatus);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── The filter is in the address ────────────────────────────────────────
  //
  // Read ONCE, as the initial state, and written back on every change. It is not
  // held in the URL and read from it on each render: the two would have to agree
  // about every keystroke, and the one that lost would silently overwrite the
  // other. State is the single holder; the address is a copy kept in step with
  // it, which is what makes a filtered archive something that can be bookmarked,
  // refreshed and pasted to somebody else.
  //
  // Everything arriving here has come from outside the application — see
  // archiveFilterParams.js, where an unusable value becomes "no filter" rather
  // than an error.
  const initial = useMemo(() => readFilters(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [typeFilter, setTypeFilter] = useState(initial.typeFilter);
  const [searchQuery, setSearchQuery] = useState(initial.searchQuery);
  const [creatorFilter, setCreatorFilter] = useState(initial.creatorFilter);
  // Two lists, not one. `tagIds` says which branches to look in; `excludedTagIds`
  // says which parts of them to leave out. "Everything in תורה except שמות" needs
  // both: naming the four books to keep says something else entirely — choices
  // under one heading are alternatives, so it would also return an item that is
  // in only one of them and says nothing about שמות. The rule the two describe
  // together lives in componentsArchive/tagStates.js.
  const [tagIds, setTagIds] = useState(initial.tagIds);
  const [excludedTagIds, setExcludedTagIds] = useState(initial.excludedTagIds);
  const [dates, setDates] = useState(initial.dates);
  // Fetched rather than derived from the loaded media: a tag can exist in the
  // vocabulary before anything the archive currently holds carries it.
  // The whole taxonomy — a few hundred rows, fetched once. The drill-down then
  // costs nothing per click, which is what makes walking it feel like a menu
  // rather than a series of page loads.
  const [tagTree, setTagTree] = useState([]);
  // From its own endpoint, NOT from the rows on screen. The listing is filtered
  // server-side now, so deriving this from it would leave the menu holding only
  // the creator already chosen — no way across and no way back without clearing.
  const [knownCreators, setKnownCreators] = useState([]);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  // The item whose tags are being edited. The whole row, not an id: the dialog
  // seeds itself from tag_ids and titles itself from the title, and looking both
  // up again from a list that the next fetch may have replaced is a race.
  const [tagTargetItem, setTagTargetItem] = useState(null);

  useEffect(() => {
    mediaApi
      .tags()
      // Silent: an empty tag filter is indistinguishable from "no tags exist
      // yet", and a toast about it would report a problem nobody has.
      .then(setTagTree)
      .catch(() => setTagTree([]));

    mediaApi
      .creators()
      .then((rows) => setKnownCreators(rows.map((r) => r.name)))
      .catch(() => setKnownCreators([]));
  }, []);

  // The shape of the tree, walked once per tree rather than once per question.
  const tagRelations = useMemo(() => buildTagRelations(tagTree), [tagTree]);
  const tagSelection = useMemo(
    () => ({ includedIds: tagIds, excludedIds: excludedTagIds }),
    [tagIds, excludedTagIds]
  );

  // A tag can be deleted while it still sits in somebody's filter. What is left
  // behind is the quietest kind of empty archive: no chip can be drawn for it —
  // there is no name — while the request still asks for it and the server
  // answers, correctly, that nothing carries it.
  //
  // Runs when the TREE changes, not on every decision, because that is when the
  // answer can change. pruneUnknownTags treats an empty tree as "not loaded yet"
  // rather than "no tags exist", so the first render cannot erase a filter that
  // is perfectly valid.
  // It also runs against a selection that came out of the ADDRESS, which was not
  // built one click at a time and carries no guarantee of being coherent —
  // somebody may have edited it, or shared a link written before the vocabulary
  // was reorganised. Normalising is what turns it into the same lists a sequence
  // of clicks would have produced; see tagStates.js for the three combinations
  // the server cannot answer the way the screen would suggest.
  useEffect(() => {
    const pruned = pruneUnknownTags(tagRelations, tagSelection);
    const settled = normalizeSelection(tagRelations, pruned);
    if (sameSelection(settled, tagSelection)) return;
    setTagIds(settled.includedIds);
    setExcludedTagIds(settled.excludedIds);
    // Only for tags that no longer exist, and not for normalising. One is a
    // change to the question the user asked and the other is housekeeping they
    // never made a decision about — a toast for the second would report a
    // problem nobody has.
    if (!sameSelection(pruned, tagSelection)) {
      dispatch(
        notify({
          message: "חלק מהתגיות בסינון כבר אינן קיימות והוסרו ממנו",
          severity: "info",
        })
      );
    }
    // tagSelection is deliberately not a dependency: this reacts to the
    // vocabulary changing, and re-running it on every click would be asking the
    // same question again with the same answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagRelations, dispatch]);

  // The address, kept in step with the filter.
  //
  // REPLACE, never push. A filter is refined a keystroke and a chip at a time,
  // and pushing would bury the page somebody arrived from under thirty entries
  // that all say "the archive" — the back button would stop working in the only
  // sense a person cares about.
  //
  // Compared as strings before writing, because writeFilters is what decides how
  // a filter is spelled: two ways of holding the same filter produce the same
  // address, so an unchanged filter writes nothing and cannot start a render of
  // its own.
  useEffect(() => {
    const next = writeFilters({
      typeFilter,
      searchQuery,
      creatorFilter,
      tagIds,
      excludedTagIds,
      dates,
    }).toString();
    if (next === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
  }, [typeFilter, searchQuery, creatorFilter, tagIds, excludedTagIds, dates, searchParams, setSearchParams]);

  // ── Filtering happens in ONE place, and it is the server ─────────────────
  //
  // It used to happen twice: the server had a full implementation nothing
  // called, and the browser had a second copy that actually ran. They had
  // already drifted — the browser matched tags by NAME, so choosing "שופטים" the
  // parasha also returned shiurim on the book of Shoftim, which is precisely the
  // ambiguity the server's id-based filter was written to prevent.
  //
  // The browser copy is gone. `filteredMedia` below is now simply what the
  // server returned, so there is no second rule left to disagree.
  //
  // The search term is debounced because this now costs a request per keystroke;
  // everything else changes on a click and fires immediately.
  const debouncedSearch = useDebounced(searchQuery, 300);

  useEffect(() => {
    dispatch(
      fetchAllMedia({
        // Omitted rather than sent empty: an absent parameter is "no filter",
        // and sending "" would have the server compare against an empty string.
        ...(typeFilter && { type: typeFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(creatorFilter && { creator: creatorFilter }),
        ...(tagIds.length > 0 && { tagIds }),
        // The name has to match the server's exactly and nothing links the two
        // repositories: server/test/mediaFilterMirror.test.js is what fails if
        // it stops matching, because the request itself would still answer 200
        // with an unfiltered archive.
        ...(excludedTagIds.length > 0 && { excludeTagIds: excludedTagIds }),
        ...(dates.uploadedAfter && { uploadedAfter: dates.uploadedAfter }),
        ...(dates.uploadedBefore && { uploadedBefore: dates.uploadedBefore }),
      })
    );
  }, [dispatch, typeFilter, debouncedSearch, creatorFilter, tagIds, excludedTagIds, dates]);

  const handleFilter = (type) => setTypeFilter(type);
  const handleCreatorFilter = (name) => setCreatorFilter(name);
  // Both lists, always. An exclusion left behind by a "clear" is a filter that is
  // still narrowing the archive with nothing on screen that says so — the exact
  // failure the count on the filter button exists to prevent.
  const handleClearTags = () => {
    setTagIds([]);
    setExcludedTagIds([]);
  };

  // One click moves a tag one position along: nothing → chosen → left out →
  // nothing. Both transitions are real requests — "narrow to this parasha" and
  // "everything in this book except this parasha" — and before the second one
  // existed, clicking a child of a chosen branch could only ever ADD it, which
  // is why an inherited tag could not be un-chosen at all.
  //
  // The rule itself is in componentsArchive/tagStates.js, with its test. What
  // belongs here is only that a click changes page state, which is the line
  // between this file and the components.
  const applyTagDecision = (next) => {
    setTagIds(next.includedIds);
    setExcludedTagIds(next.excludedIds);
  };

  const handleCycleTag = (id) =>
    applyTagDecision(cycleTagDecision(tagRelations, tagSelection, id));

  // Forgetting a tag entirely, whichever list it is in. This is what the chips
  // above the drill-down do, and it cannot be the cycle: one more click on an
  // EXCLUDED tag would move it into the chosen list — turning "not this branch"
  // into "only this branch", from a control labelled "remove".
  const handleRemoveTag = (id) => applyTagDecision(forgetTag(tagRelations, tagSelection, id));
  const handleDateFilter = (key, value) => setDates((prev) => ({ ...prev, [key]: value }));

  // Clears everything INSIDE the panel — not the type toggle and not the search
  // box, which are visible at all times and were never hidden from the user.
  const handleClearFilters = () => {
    setCreatorFilter("");
    setTagIds([]);
    setExcludedTagIds([]);
    setDates({ uploadedAfter: "", uploadedBefore: "" });
  };
  const handleSearch = (query) => setSearchQuery(query);
  const handleOpenMedia = (id) => navigate(`/media/${id}`);
  // Smart-search result → open the media and jump the player to the segment.
  // The ?t= seconds are read by MediaViewPage and seeked once the player is ready.
  // A hit inside a book has no timestamp (start_time is null), so it opens the
  // document with no ?t= at all rather than a "?t=null" that means nothing.
  const handleOpenResult = (mediaId, startTime) =>
    navigate(
      Number.isFinite(Number(startTime)) && startTime !== null
        ? `/media/${mediaId}?t=${startTime}`
        : `/media/${mediaId}`
    );
  const handleOpenUpload = () => dispatch(openUpload());

  const handleDeleteRequest = (id) => setDeleteTargetId(id);
  const handleDeleteCancel = () => setDeleteTargetId(null);
  const handleDeleteConfirm = async () => {
    await dispatch(deleteMedia(deleteTargetId));
    setDeleteTargetId(null);
  };

  // Tagging an item that already exists. Until this the only way to tag anything
  // was to upload it — which is why the archive held nineteen items and not one
  // tagged row, and why every filter in the panel matched nothing.
  const handleEditTags = (item) => setTagTargetItem(item);
  const handleEditTagsCancel = () => setTagTargetItem(null);

  const handleEditTagsSave = async (id, { tagIds: chosenIds, tags: typedNames }) => {
    const result = await dispatch(updateMedia({ id, tagIds: chosenIds, tags: typedNames }));
    const ok = result.meta.requestStatus === "fulfilled";
    dispatch(
      notify(
        ok
          ? { message: "התגיות עודכנו", severity: "success" }
          : { message: result.payload || "עדכון התגיות נכשל", severity: "error" }
      )
    );
    if (!ok) return;
    setTagTargetItem(null);
    // The tag tree carries a count per node, and it has just changed. Re-fetched
    // rather than adjusted by hand: the count is over a whole subtree, so
    // guessing which nodes moved is a second implementation of the query.
    mediaApi.tags().then(setTagTree).catch(() => {});
  };

  // Publishing is what makes an item visible to students, so it is worth
  // confirming out loud in both directions rather than leaving the user to infer
  // it from an icon that changed colour.
  const handleTogglePublish = async (item) => {
    const next = !item.is_published;
    const result = await dispatch(updateMedia({ id: item.id, isPublished: next }));
    const ok = result.meta.requestStatus === "fulfilled";
    dispatch(
      notify(
        ok
          ? { message: next ? "הפריט פורסם ומוצג לתלמידים" : "הפריט הוסתר מהתלמידים", severity: "success" }
          : { message: result.payload || "עדכון הפרסום נכשל", severity: "error" }
      )
    );
  };

  // What the server returned. No second pass here on purpose — see the fetch
  // above for why the browser-side copy was removed rather than corrected.
  const filteredMedia = allMedia;

  // Whether the empty grid is due to an active filter/search (vs a truly empty
  // archive) — lets the empty state choose between "no results" and the upload CTA.
  const hasActiveFilter = Boolean(
    typeFilter ||
      searchQuery ||
      creatorFilter ||
      tagIds.length ||
      // An exclusion narrows the archive on its own — "everything except X" is a
      // filter, so an empty grid under one is "no results", not an empty archive.
      excludedTagIds.length ||
      dates.uploadedAfter ||
      dates.uploadedBefore
  );

  return {
    filteredMedia, status, typeFilter, hasActiveFilter,
    creatorFilter, knownCreators, handleCreatorFilter,
    tagIds, excludedTagIds, tagTree, handleCycleTag, handleRemoveTag, handleClearTags,
    dates, handleDateFilter, handleClearFilters,
    handleFilter, handleSearch, handleOpenMedia, handleOpenUpload, handleOpenResult,
    deleteTargetId, handleDeleteRequest, handleDeleteCancel, handleDeleteConfirm,
    tagTargetItem, handleEditTags, handleEditTagsCancel, handleEditTagsSave,
    handleTogglePublish,
  };
};

export default useArchivePageController;
