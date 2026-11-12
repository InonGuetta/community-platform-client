import { useEffect, useMemo, useState } from "react";
import { notesApi } from "../../../api/notesApi";
import { useDebounced } from "../../../utilities/useDebounced";
import { noteHtmlToPlainText } from "../../../utilities/noteHtml";

// The notebook's search box and the notes it leaves on screen.
/**
 * @param {{ items: any[], drafts: Record<string, { title: string, body: string }> }} args
 */
export const useNotesSearch = ({ items, drafts }) => {
  const [search, setSearch] = useState("");

  // Searched on the WORDS, not on the stored body: a body is markup, and
  // matching it raw would find notes by their tag names ("mark", "li") and miss
  // a phrase that happens to have a bold word in the middle of it.
  //
  // On the SERVER (NOTE-17): this page no longer holds every body, and the
  // server holds every note's words (body_text, migration 038). Its answer is a
  // set of ids. Matched here as well, against what is on screen: a title or a
  // draft typed but not saved is not on the server yet, and a note must not
  // vanish from its own search the moment its user types the word.
  const debouncedSearch = useDebounced(search.trim(), 300);
  const [serverMatches, setServerMatches] = useState(null);
  useEffect(() => {
    if (!debouncedSearch) {
      setServerMatches(null);
      return undefined;
    }
    let live = true;
    notesApi
      .list({ q: debouncedSearch })
      .then((rows) => { if (live) setServerMatches(new Set(rows.map((n) => n.id))); })
      // A failed search falls back to what is on screen rather than to nothing.
      .catch(() => { if (live) setServerMatches(new Set()); });
    return () => { live = false; };
  }, [debouncedSearch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => {
      if (serverMatches?.has(n.id)) return true;
      const draft = drafts[n.id];
      const words = draft ? noteHtmlToPlainText(draft.body) : n.preview ?? noteHtmlToPlainText(n.body);
      return `${draft?.title ?? n.title ?? ""} ${words} ${n.media_title || ""}`.toLowerCase().includes(q);
    });
  }, [items, search, serverMatches, drafts]);

  return { search, setSearch, filtered };
};
