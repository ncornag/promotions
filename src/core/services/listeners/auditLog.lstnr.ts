import { green, red, magenta, yellow, bold } from 'kolorist';
import { IAuditLogService, AuditlogService } from '../auditLog.svc';

export class AuditLogListener {
  private server: any;
  private service: IAuditLogService;
  private msgIn = bold(yellow('←')) + yellow('MSG:');

  constructor(server: any) {
    this.server = server;
    this.service = AuditlogService.getInstance(server);
  }

  public start() {
    this.server.log.info(
      `${magenta('#')}  ${yellow('AuditLogService')} ${green('starting in')} ${
        this.server.config.ENTITY_UPDATE_ROUTE
      }/${this.server.config.AUDITLOG_QUEUE}`
    );
    this.server.messages.subscribe(`*.*.update`, this.handler.bind(this));
  }

  private handler = async (data: any, server: any) => {
    if (!data.metadata.entity) return;
    if (server.log.isLevelEnabled('debug'))
      server.log.debug(
        `${magenta('#' + data.metadata.requestId || '')} ${this.msgIn} auditLog indexing ${green(data.source.id)}`
      );
    this.service.createAuditLog({
      entity: data.metadata.entity,
      entityId: data.source.id,
      catalogId: data.metadata.catalogId,
      updateType: data.metadata.type,
      source: data.source,
      edits: data.difference
    });
  };
}

export const auditLogListener = (server: any) => {
  return new AuditLogListener(server).start();
};
