import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DbModule } from '@db/db.module.js';
import { AuthModule } from '@auth/auth.module.js';
import { SduiModule } from '@sdui/sdui.module.js';
import { ThrottleModule } from '@common-throttle/throttle.module.js';
import { SetupModule } from '@setup/setup.module.js';
import { UsuariosModule } from '@usuarios/usuarios.module.js';
import { SolicitudesClaveModule } from '@solicitudes-clave/solicitudes-clave.module.js';
import { FlujosModule } from '@flujos/flujos.module.js';
import { MarcaModule } from '@marca/marca.module.js';
import { SeedersModule } from '@seeders/seeders.module.js';
import { ProgramasModule } from '@programas/programas.module.js';
import { PlantillasModule } from '@plantillas/plantillas.module.js';
import { AuditoresModule } from '@auditores/auditores.module.js';
import { AuditoriasModule } from '@auditorias/auditorias.module.js';
import { EjecucionModule } from '@ejecucion/ejecucion.module.js';
import { InformesModule } from '@informes/informes.module.js';
import { AccionesModule } from '@acciones/acciones.module.js';
import { RegistrosModule } from '@registros/registros.module.js';
import { SeguimientoModule } from '@seguimiento/seguimiento.module.js';
import { NotificacionesModule } from '@notificaciones/notificaciones.module.js';

@Module({
  imports: [
    DbModule,
    ThrottleModule,
    SetupModule,
    SeedersModule,
    AuthModule,
    SduiModule,
    SeguimientoModule,
    RegistrosModule,
    ProgramasModule,
    PlantillasModule,
    AuditoresModule,
    AuditoriasModule,
    EjecucionModule,
    InformesModule,
    AccionesModule,
    NotificacionesModule,
    UsuariosModule,
    SolicitudesClaveModule,
    FlujosModule,
    MarcaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
