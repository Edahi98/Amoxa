import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DB } from '@db/db.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { SeguimientoModule } from '@seguimiento/seguimiento.module.js';
import { ScreenDataRegistry } from '@sdui-data/screen-data-registry.js';
import { TestDatabase } from '@testing-database/test-database.js';
import { RecordsController } from '@registros-consulta/records.controller.js';
import { NotificationsController } from '@notificaciones-bandeja-notifications/notifications.controller.js';
import { IndicatorsController } from '@seguimiento-indicadores-indicators/indicators.controller.js';
import { RevisionDireccionController } from '@seguimiento-revision/revision-direccion.controller.js';

describe('Cableado de los módulos de seguimiento, registros y notificaciones', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await TestDatabase.create();
  }, 60000);

  afterAll(async () => {
    await database.close();
  });

  it('resuelve las dependencias de controladores y proveedores de pantalla', async () => {
    @Global()
    @Module({ providers: [{ provide: DB, useFactory: () => database.db }], exports: [DB] })
    class FakeDbModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [FakeDbModule, SeguimientoModule, RegistrosModule, NotificacionesModule],
    }).compile();

    expect(moduleRef.get(IndicatorsController, { strict: false })).toBeDefined();
    expect(moduleRef.get(RevisionDireccionController, { strict: false })).toBeDefined();
    expect(moduleRef.get(RecordsController, { strict: false })).toBeDefined();
    expect(moduleRef.get(NotificationsController, { strict: false })).toBeDefined();
    for (const screenId of ScreenDataRegistry.screenIds()) {
      expect(moduleRef.get(ScreenDataRegistry.providerFor(screenId)!, { strict: false }), screenId).toBeDefined();
    }
    await moduleRef.close();
  });
});
