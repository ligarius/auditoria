import { env } from '../core/config/env.js';
import { logger } from '../core/config/logger.js';

type EmailPayload = {
  to: string[];
  subject: string;
  html: string;
};

export const notificationService = {
  async sendEmail({ to, subject, html: _html }: EmailPayload) {
    const sender = env.notificationsEmailFrom;
    const recipients = Array.from(
      new Set([...to, ...env.notificationsEmailRecipients])
    );

    if (!sender || recipients.length === 0) {
      logger.debug(
        {
          senderConfigured: Boolean(sender),
          requestedRecipients: to
        },
        'Notificación por correo omitida (no configurada)'
      );
      return false;
    }

    logger.info(
      {
        from: sender,
        to: recipients,
        subject
      },
      'Correo de notificación emitido'
    );

    // Aquí se integraría el proveedor de correo real.
    return true;
  }
};
