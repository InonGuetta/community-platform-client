// Is this SHAPED like an address?
//
// A MIRROR of emailProblem in the server's lib/validate.js. The two repositories
// share no code, so this is a copy — and the direction of any drift is the safe
// one: the server is the authority and re-checks everything, so a client that is
// too permissive only means the user learns a moment later. A client that is
// too strict would lock somebody out with no way around it, which is why both
// copies err towards accepting.
//
// It exists at all because the alternative is a round trip to be told about a
// missing dot. `type="email"` on the input is not enough: browsers accept
// "user@localhost" and reject nothing a person is likely to mistype.

import i18n from "../i18n/i18n";

const EMAIL_MAX = 254;
const LOCAL_MAX = 64;
const LABEL_MAX = 63;

const LOCAL_ALLOWED = /^[^\s@,;:<>()[\]\\"]+$/u;
const LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
const TLD = /^\p{L}{2,}$/u;

/** Returns null when usable, or the reason it is not, in the interface's language. */
const reason = (key) => i18n.t(`auth:emailShape.${key}`);

export const emailProblem = (value) => {
  if (typeof value !== "string" || value.trim() === "") return reason("required");

  const email = value.trim();
  if (email.length > EMAIL_MAX) return reason("tooLong");
  if (/\s/.test(email)) return reason("spaces");

  const at = email.split("@");
  if (at.length < 2) return reason("noAt");
  if (at.length > 2) return reason("manyAt");

  const [local, domain] = at;

  if (local.length === 0) return reason("noLocal");
  if (local.length > LOCAL_MAX) return reason("localTooLong");
  if (!LOCAL_ALLOWED.test(local)) return reason("localInvalid");
  if (local.startsWith(".") || local.endsWith(".")) return reason("localDotEdge");
  if (local.includes("..")) return reason("localDoubleDot");

  if (domain.length === 0) return reason("noDomain");
  if (domain.includes("..")) return reason("domainDoubleDot");
  if (domain.startsWith(".") || domain.endsWith(".")) return reason("domainDotEdge");

  const labels = domain.split(".");
  if (labels.length < 2) return reason("noSuffix");

  for (const label of labels) {
    if (label.length === 0 || label.length > LABEL_MAX) return reason("domainInvalid");
    if (!LABEL.test(label)) return reason("domainChars");
  }

  if (!TLD.test(labels[labels.length - 1])) return reason("suffixInvalid");

  return null;
};
