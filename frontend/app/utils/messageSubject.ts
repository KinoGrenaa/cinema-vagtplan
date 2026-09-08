export function getConversationDisplaySubject(
  subject: string,
) {
  const trimmed =
    subject.trim();
  const withoutReplyPrefix =
    trimmed
      .replace(
        /^(?:sv:\s*)+/i,
        "",
      )
      .trim();

  return (
    withoutReplyPrefix ||
    trimmed
  );
}
