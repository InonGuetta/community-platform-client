import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { requestRole } from "../../../store/slicesAndThunks/authSlices/authPost";
import { selectUser } from "../../../store/selectors/authSelectors";
import { roles } from "../../../utilities/constant";

// What the role-request card does — the role chosen and sending it — so that
// RoleRequestCard.jsx is layout only.

export const useRoleRequest = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [choice, setChoice] = useState(roles.lecturer);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await dispatch(requestRole(choice));
    } finally {
      setSubmitting(false);
    }
  };

  return { user, choice, setChoice, submitting, submit };
};
