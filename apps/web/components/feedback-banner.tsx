import { decodeUserFacingMessage } from "../lib/server/user-facing-errors";

type FeedbackBannerProps = {
  error?: string;
  notice?: string;
  success?: string;
};

export function FeedbackBanner({ error, notice, success }: FeedbackBannerProps) {
  const errorMessage = decodeUserFacingMessage(error);
  const noticeMessage = decodeUserFacingMessage(notice);
  const successMessage = decodeUserFacingMessage(success);

  if (!errorMessage && !noticeMessage && !successMessage) {
    return null;
  }

  return (
    <div className="feedbackStack">
      {successMessage ? (
        <div className="dashboardCard statusCard successCard">
          <p className="cardLabel">Success</p>
          <p>{successMessage}</p>
        </div>
      ) : null}
      {noticeMessage ? (
        <div className="dashboardCard statusCard infoCard">
          <p className="cardLabel">Notice</p>
          <p>{noticeMessage}</p>
        </div>
      ) : null}
      {errorMessage ? (
        <div className="dashboardCard statusCard warningCard">
          <p className="cardLabel">Action needed</p>
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
