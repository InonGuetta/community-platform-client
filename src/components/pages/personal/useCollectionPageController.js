import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectUser } from "../../../store/selectors/authSelectors";

// One personal shelf (likes, saves...): the fetch and the selection for the
// shelf it is given, so CollectionPage.jsx is layout only (the
// useXxxPageController rule).
export const useCollectionPageController = ({ shelf }) => {
  const { label, collection } = shelf;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items, status } = useSelector(collection.selectSlice);
  const user = useSelector(selectUser);

  useEffect(() => { dispatch(collection.fetch()); }, [dispatch, collection]);

  // A shelf may show only PART of what its thunk loaded — the saved shelf keeps
  // the lectures filed in lists out of the loose grid, because they are shown in
  // the lists below it and would otherwise appear twice. The predicate lives on
  // the shelf, next to the fetch it filters, rather than as an "is this the
  // saved page" test in here.
  const shown = collection.filterItems ? items.filter(collection.filterItems) : items;

  // Nothing loose to show is not the same as nothing saved at all: with every
  // item filed away, the ordinary empty state would tell the user they have
  // saved nothing while their lists sit right underneath saying otherwise.
  const emptyMessage = items.length && !shown.length && collection.emptyFilteredMessage
    ? collection.emptyFilteredMessage
    : collection.emptyMessage;

  return {
    collection,
    emptyMessage,
    items,
    label,
    navigate,
    shown,
    status,
    user,
  };
};
