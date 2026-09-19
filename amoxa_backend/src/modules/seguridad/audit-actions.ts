export class AuditActions {
  public static readonly SETUP_ACTIVATED = 'system.setup_activated';
  public static readonly USER_CREATED = 'user.created';
  public static readonly USER_UPDATED = 'user.updated';
  public static readonly USER_ROLE_CHANGED = 'user.role_changed';
  public static readonly USER_STATUS_CHANGED = 'user.status_changed';
  public static readonly USER_INVITED = 'user.invited';
  public static readonly PROFILE_UPDATED = 'profile.updated';
  public static readonly PASSWORD_CHANGED = 'password.changed';
  public static readonly PASSWORD_REQUEST_CREATED = 'password_request.created';
  public static readonly PASSWORD_REQUEST_APPROVED = 'password_request.approved';
  public static readonly PASSWORD_REQUEST_REJECTED = 'password_request.rejected';
  public static readonly PASSWORD_RESET_COMPLETED = 'password.reset_completed';
  public static readonly PASSWORD_REQUESTS_EXPIRED = 'password_request.expired';
  public static readonly REPORT_LINK_CREATED = 'report.link_created';
  public static readonly REPORT_LINK_REVOKED = 'report.link_revoked';
  public static readonly BRAND_UPDATED = 'brand.updated';
  public static readonly REPORT_LINK_OPENED = 'report.link_opened';
}
