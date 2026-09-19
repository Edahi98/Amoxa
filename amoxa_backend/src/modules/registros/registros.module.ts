import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module.js';
import { RecordVersionService } from '@registros-versionado/record-version.service.js';
import { RecordHistoryDataProvider } from '@registros-consulta-record/record-history-data.provider.js';
import { RecordHistoryService } from '@registros-consulta-record/record-history.service.js';
import { RecordSearchDataProvider } from '@registros-consulta-record/record-search-data.provider.js';
import { RecordSearchService } from '@registros-consulta-record/record-search.service.js';
import { RecordsController } from '@registros-consulta/records.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [RecordsController],
  providers: [
    RecordVersionService,
    RecordSearchService,
    RecordHistoryService,
    RecordSearchDataProvider,
    RecordHistoryDataProvider,
  ],
  exports: [RecordVersionService],
})
export class RegistrosModule {}
