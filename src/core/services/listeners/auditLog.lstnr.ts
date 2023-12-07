import { green, red, magenta, yellow, bold } from 'kolorist';
import { IAuditLogService, AuditlogService } from '../auditLog.svc';

const msgIn = bold(yellow('←')) + yellow('MSG:');
let service: IAuditLogService;

const handler = async (data: any, server: any) => {
  server.log.debug(
    `${magenta('#' + data.metadata.requestId || '')} ${msgIn} auditLog indexing ${green(data.source.id)}`
  );
  service.createAuditLog({
    entity: data.metadata.entity,
    entityId: data.source.id,
    catalogId: data.metadata.catalogId,
    updateType: data.metadata.type,
    source: data.source,
    edits: data.difference
  });
};

export class AuditLogListener {
  private server: any;
  constructor(server: any) {
    this.server = server;
  }
  start() {
    this.server.log.info(
      `${magenta('#')}  ${yellow('AuditLogService')} ${green('starting in')} ${
        this.server.config.ENTITY_UPDATE_ROUTE
      }/${this.server.config.AUDITLOG_QUEUE}`
    );
    this.server.messages.subscribe(
      {
        routingKey: this.server.config.ENTITY_UPDATE_ROUTE,
        queue: {
          exclusive: true,
          autoDelete: true,
          name: this.server.config.AUDITLOG_QUEUE
        },
        exchange: {
          type: 'topic',
          durable: false,
          name: this.server.config.EXCHANGE
        },
        consumerOptions: {
          noAck: true
        }
      },
      (data: any) => {
        handler(data, this.server);
      }
    );
  }
}

export const auditLogListener = (server: any) => {
  service = AuditlogService.getInstance(server);
  return new AuditLogListener(server).start();
};
