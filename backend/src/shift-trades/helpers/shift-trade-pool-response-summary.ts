type Participant = {
  id: number;
  firstName: string;
  lastName: string;
};

type QualifiedRecipient =
  Participant & {
    userJobFunctions: Array<{
      jobFunctionId: number;
    }>;
  };

type PoolDecline = {
  userId: number;
  declinedAt: Date;
  user: Participant;
};

export function buildShiftTradePoolResponseSummary(
  jobFunctionId: number,
  qualifiedRecipients: QualifiedRecipient[],
  declines: PoolDecline[],
) {
  const currentRecipients =
    qualifiedRecipients.filter(
      (recipient) =>
        recipient.userJobFunctions.some(
          (assignment) =>
            assignment.jobFunctionId ===
            jobFunctionId,
        ),
    );
  const declinedUserIds =
    new Set(
      declines.map(
        (decline) =>
          decline.userId,
      ),
    );
  const pending =
    currentRecipients
      .filter(
        (recipient) =>
          !declinedUserIds.has(
            recipient.id,
          ),
      )
      .map(
        ({
          id,
          firstName,
          lastName,
        }) => ({
          id,
          firstName,
          lastName,
        }),
      );
  const declined =
    declines.map(
      (decline) => ({
        userId:
          decline.userId,
        declinedAt:
          decline.declinedAt,
        user:
          decline.user,
      }),
    );
  const totalRecipientIds =
    new Set([
      ...currentRecipients.map(
        (recipient) =>
          recipient.id,
      ),
      ...declines.map(
        (decline) =>
          decline.userId,
      ),
    ]);

  return {
    totalRecipients:
      totalRecipientIds.size,
    declinedCount:
      declined.length,
    pendingCount:
      pending.length,
    declined,
    pending,
  };
}
