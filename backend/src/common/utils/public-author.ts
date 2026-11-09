/**
 * User fields that may be attached to public content (resume feed, resume
 * detail, comment threads). Those routes need no login, and the privacy page
 * promises posts are shown under the anonymous username only — so never add
 * `name`, `email` or `avatar` (the Google profile photo) here.
 */
export const PUBLIC_AUTHOR_FIELDS = "anonymousUsername";

/** Populates `userId` on a public-content query with only the safe fields. */
export const populateAuthor = (q: any) => q.populate("userId", PUBLIC_AUTHOR_FIELDS);
