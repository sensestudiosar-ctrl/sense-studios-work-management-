import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { loadRuntimeConfig, RUNTIME_CONFIG } from "./config.js";
import { DATABASE_PROBE, DatabaseService } from "./database.service.js";
import { HealthController } from "./health.controller.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";
import { AuthGuard } from "./auth.guard.js";
import { OrganizationController } from "./organization.controller.js";
import { OrganizationService } from "./organization.service.js";
import { AuthorizationService } from "./authorization.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { BrevoEmailAdapter } from "./brevo-email.js";
import { CURRENT_RECIPIENT_AUTHORIZATION_PREDICATE, NotificationWorker, PersistedVerifiedAddressPredicate, UnauthorizedRecipientPredicate, VERIFIED_ADDRESS_PREDICATE } from "./notification-worker.js";
import { AuditRetentionController } from "./audit-retention.controller.js";
import { AuditRetentionService } from "./audit-retention.service.js";
import { EmailVerificationService } from "./email-verification.service.js";
import { ApprovalService } from "./approval.service.js";
import { ApprovalsController } from "./approvals.controller.js";
import { CrmController } from "./crm.controller.js";
import { CrmService } from "./crm.service.js";
import { ProjectController } from "./project.controller.js";
import { ProjectService } from "./project.service.js";
import { ProjectWorkflowService } from "./project-workflow.service.js";

@Module({
  controllers: [HealthController, IdentityController, OrganizationController, NotificationsController, AuditRetentionController, ApprovalsController, CrmController, ProjectController],
  providers: [
    { provide: RUNTIME_CONFIG, useFactory: loadRuntimeConfig },
    DatabaseService,
    { provide: DATABASE_PROBE, useExisting: DatabaseService },
    IdentityService,
    OrganizationService,
    AuthorizationService,
    AuditRetentionService,
    EmailVerificationService,
    ApprovalService,
    CrmService,
    ProjectService,
    ProjectWorkflowService,
    NotificationsService,
    { provide: BrevoEmailAdapter, useFactory: (config: ReturnType<typeof loadRuntimeConfig>) => new BrevoEmailAdapter({ apiKey: config.brevoApiKey, senderEmail: config.brevoSenderEmail, senderName: config.brevoSenderName }) , inject: [RUNTIME_CONFIG] },
    { provide: VERIFIED_ADDRESS_PREDICATE, useClass: PersistedVerifiedAddressPredicate },
    { provide: CURRENT_RECIPIENT_AUTHORIZATION_PREDICATE, useClass: UnauthorizedRecipientPredicate },
    NotificationWorker,
    { provide: APP_GUARD, useClass: AuthGuard }
  ]
})
export class AppModule {}
