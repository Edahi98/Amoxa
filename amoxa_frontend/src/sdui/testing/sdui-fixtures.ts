import { ScreenParserFactory } from '@sdui-parsing/screen-parser-factory';
import type { ScreenModel } from '@sdui-model-screen/screen.model';

export class SduiFixtures {
  public static rawScreen(): Record<string, unknown> {
    return {
      version: '1.0',
      screen_id: 'programa.editar',
      title: 'Programa de auditoría',
      subtitle: 'Edición del periodo',
      context: {
        user: { id: 'u1', nombre: 'Ana', rol: 'gestor', proceso_id: null },
        entity: { type: 'PROGRAMA', id: 'p1', version: 4, estado: 'borrador' },
        clause_refs: ['9.2'],
        offline: { enabled: true, cache_ttl_seconds: 3600, conflict_policy: 'manual' },
        data: {
          programa: { nombre: 'Programa 2026', periodo: '' },
          indicadores: { total: 12 },
          avance: 40,
          items: [{ id: 'i1', title: 'Auditoría interna', status: 'planeada' }, 'Elemento simple'],
          respuestas: { q1: { result: 'conforme', comment: 'ok', evidencias: [] } },
          calendario: [{ id: 'e1', date: '2026-03-10', title: 'Cierre', tone: 'info' }],
          plan: [{ id: 'g1', label: 'Fase 1', start: '2026-03-01', end: '2026-03-20', progress: 50 }],
          grafica: { 'Área Norte': 3, 'Área Sur': 5 },
          hallazgo: { title: 'Falta de evidencia', kind: 'nc_menor', evidence_count: 2 },
          accion: { title: 'Corregir registro', status: 'abierta', due_date: '2026-04-01' },
          auditoria: { title: 'Auditoría A', method: 'remoto', start_date: '2026-03-01', end_date: '2026-03-05' },
          sync: { state: 'synced', pending: 0 },
        },
      },
      root: {
        type: 'container',
        id: 'root',
        props: { direction: 'column', gap: 'lg' },
        children: [
          {
            type: 'section',
            id: 'seccion',
            props: { title: 'Datos generales' },
            children: [
              { type: 'text', id: 't_titulo', props: { text: 'Bienvenida', variant: 'heading' } },
              { type: 'text', id: 't_nombre', bind: 'programa.nombre', props: { text: '', variant: 'caption', tone: 'muted' } },
              { type: 'badge', id: 'badge_estado', props: { label: 'Borrador', tone: 'warning' } },
              { type: 'kpi', id: 'kpi_total', bind: 'indicadores.total', props: { label: 'Auditorías', value: 0 } },
              { type: 'progress', id: 'progreso', bind: 'avance', props: { label: 'Avance', value: 0 } },
              { type: 'clause_tag', id: 'clausula', clause_ref: '9.2', props: { clause: '9.2', standard: 'ISO 9001' } },
              { type: 'divider', id: 'divisor', props: { label: 'Captura' } },
              {
                type: 'card',
                id: 'tarjeta',
                props: { title: 'Resumen', tone: 'glass' },
                children: [{ type: 'text', id: 't_card', props: { text: 'Dentro de la tarjeta' } }],
              },
              { type: 'list', id: 'lista', bind: 'items', props: { variant: 'divided', emptyText: 'Sin elementos' } },
              {
                type: 'tabs',
                id: 'pestanas',
                props: { defaultTab: 'tab_a' },
                children: [
                  {
                    type: 'container',
                    id: 'tab_a',
                    props: { label: 'General' },
                    children: [{ type: 'text', id: 't_tab_a', props: { text: 'Contenido A' } }],
                  },
                  {
                    type: 'container',
                    id: 'tab_b',
                    props: { label: 'Detalle' },
                    children: [{ type: 'text', id: 't_tab_b', props: { text: 'Contenido B' } }],
                  },
                ],
              },
            ],
          },
          {
            type: 'section',
            id: 'formulario',
            props: { title: 'Formulario' },
            children: [
              {
                type: 'text_input',
                id: 'periodo',
                bind: 'programa.periodo',
                required: true,
                validations: ['PERIODO_VACIO'],
                props: { label: 'Periodo', placeholder: '2026' },
                on: { change: 'aplicar_filtros' },
              },
              { type: 'textarea', id: 'objetivo', bind: 'programa.objetivo', props: { label: 'Objetivo', rows: 3 } },
              { type: 'number_input', id: 'presupuesto', bind: 'programa.presupuesto', props: { label: 'Presupuesto', unit: 'MXN' } },
              { type: 'date_input', id: 'inicio', bind: 'programa.inicio', props: { label: 'Inicio' } },
              {
                type: 'select',
                id: 'tipo',
                bind: 'programa.tipo',
                props: { label: 'Tipo', options: [{ value: 'interna', label: 'Interna' }, { value: 'externa', label: 'Externa' }] },
              },
              {
                type: 'multiselect',
                id: 'areas',
                bind: 'programa.areas',
                props: { label: 'Áreas', options: [{ value: 'a1', label: 'Calidad' }, { value: 'a2', label: 'Compras' }] },
              },
              { type: 'toggle', id: 'activo', bind: 'programa.activo', props: { label: 'Activo' } },
              {
                type: 'radio_group',
                id: 'modo',
                bind: 'programa.modo',
                props: { label: 'Modo', options: [{ value: 'in_situ', label: 'In situ' }, { value: 'remoto', label: 'Remoto' }] },
              },
              {
                type: 'person_picker',
                id: 'responsable',
                bind: 'programa.responsable',
                props: { label: 'Responsable', options: [{ value: 'u1', label: 'Ana' }], multiple: false },
              },
              {
                type: 'process_picker',
                id: 'proceso',
                bind: 'programa.proceso',
                props: { label: 'Proceso', options: [{ value: 'p1', label: 'Compras' }], multiple: true },
              },
              {
                type: 'clause_picker',
                id: 'clausulas',
                bind: 'programa.clausulas',
                props: { label: 'Cláusulas', options: [{ value: '9.2', label: '9.2 Auditoría interna' }], multiple: true },
              },
              {
                type: 'checklist_item',
                id: 'item_q1',
                bind: 'respuestas.q1',
                clause_ref: '7.5',
                props: { question: '¿Se controla la información documentada?', clause: '7.5', criterion: 'norma' },
                children: [
                  { type: 'evidence_capture', id: 'evidencia_q1', bind: 'respuestas.q1.evidencias', props: { label: 'Evidencia', requireGeo: false } },
                ],
              },
              { type: 'signature', id: 'firma', bind: 'programa.firma', props: { label: 'Firma del gestor', signerName: 'Ana' } },
              { type: 'geo_stamp', id: 'ubicacion', bind: 'programa.ubicacion', props: { label: 'Ubicación' } },
            ],
          },
          {
            type: 'section',
            id: 'registros',
            props: { title: 'Registros' },
            children: [
              { type: 'finding_card', id: 'hallazgo', bind: 'hallazgo', on: { press: 'ir_inicio' } },
              { type: 'action_card', id: 'accion', bind: 'accion' },
              { type: 'audit_card', id: 'auditoria', bind: 'auditoria', on: { press: 'ir_inicio' } },
              { type: 'program_calendar', id: 'calendario', bind: 'calendario', on: { press: 'ir_inicio' } },
              { type: 'gantt', id: 'gantt', bind: 'plan', on: { press: 'ir_inicio' } },
              {
                type: 'chart',
                id: 'grafica',
                bind: 'grafica',
                props: { kind: 'bar', title: 'Incumplimientos por área', ariaLabel: 'Incumplimientos por área', labels: [], datasets: [{ label: 'Incumplimientos', data: [] }] },
              },
              { type: 'code_scanner', id: 'codigo', bind: 'codigo', props: { label: 'Código' } },
              { type: 'sortable_list', id: 'orden', bind: 'orden', props: { label: 'Orden' } },
              { type: 'file_input', id: 'archivo', bind: 'archivo', props: { label: 'Archivo', accept: '.xlsx' } },
              {
                type: 'table',
                id: 'tabla',
                bind: 'filas',
                props: { caption: 'Filas', emptyText: 'Sin filas', columns: [{ key: 'nombre', label: 'Nombre', sortable: true }] },
              },
              { type: 'banner', id: 'aviso', props: { tone: 'info', title: 'Aviso', message: 'Los datos se guardan sin conexión.' } },
              {
                type: 'empty_state',
                id: 'vacio',
                props: { title: 'Sin hallazgos', description: 'Aún no hay hallazgos.' },
                children: [{ type: 'text', id: 't_vacio', props: { text: 'Crea el primero' } }],
              },
              { type: 'sync_status', id: 'sincronizacion', bind: 'sync', props: { state: 'synced' } },
            ],
          },
          {
            type: 'container',
            id: 'acciones',
            props: { direction: 'row', gap: 'sm', wrap: true },
            children: [
              { type: 'button', id: 'btn_guardar', props: { label: 'Guardar programa', variant: 'primary' }, on: { press: 'guardar' } },
              { type: 'button', id: 'btn_confirmar', props: { label: 'Cerrar programa', variant: 'outline' }, on: { press: 'confirmar' } },
              {
                type: 'button',
                id: 'btn_oculto',
                props: { label: 'Solo dirección', variant: 'ghost' },
                visible_if: { field: 'user.rol', op: 'eq', value: 'direccion' },
              },
              {
                type: 'button',
                id: 'btn_deshabilitado',
                props: { label: 'Editar cerrado', variant: 'ghost' },
                enabled_if: { field: 'entity.estado', op: 'eq', value: 'cerrado' },
              },
            ],
          },
        ],
      },
      actions: {
        ir_inicio: { type: 'navigate', screen_id: 'inicio', params: { entityId: '{entity.id}', entityType: 'PROGRAMA' } },
        guardar: {
          type: 'submit',
          method: 'PUT',
          endpoint: '/programas/{entity.id}',
          idempotency_key: 'prog-{entity.id}-guardar',
          if_version: 4,
          optimistic: true,
          requires_rules: ['PERIODO_VACIO'],
          on_success: 'avisar',
          on_error: 'avisar_error',
        },
        aplicar_filtros: { type: 'call_api', method: 'GET', endpoint: '/programas/indicadores?periodo={data.programa.periodo}' },
        refrescar: { type: 'refresh' },
        abrir_detalle: { type: 'open_modal', screen_id: 'programa.lista', params: { entityId: '{entity.id}' } },
        cerrar: { type: 'close' },
        sincronizar: { type: 'sync_now' },
        capturar: { type: 'capture_media', params: { componentId: 'evidencia_q1' } },
        confirmar: { type: 'confirm', confirm_text: '¿Cerrar el programa?', on_success: 'avisar' },
        avisar: { type: 'toast', params: { message: 'Listo, {user.nombre}', tone: 'success' } },
        avisar_error: { type: 'toast', params: { message: 'No se pudo guardar', tone: 'error' } },
        salir: { type: 'logout' },
      },
      rules: [
        {
          id: 'PERIODO_VACIO',
          when: { field: 'data.programa.periodo', op: 'empty' },
          message: 'Indique el periodo del programa.',
          severity: 'block',
        },
        {
          id: 'AVANCE_BAJO',
          when: { field: 'data.avance', op: 'lt', value: 50 },
          message: 'El avance del programa es bajo.',
          severity: 'warn',
          clause_ref: '9.2',
        },
        {
          id: 'ESTADO_BORRADOR',
          when: { field: 'entity.estado', op: 'eq', value: 'borrador' },
          message: 'El programa sigue en borrador.',
          severity: 'info',
        },
      ],
      state_machine: {
        current: 'borrador',
        transitions: [
          { to: 'aprobado', action: 'guardar', roles: ['gestor', 'direccion'], requires: ['PERIODO_VACIO'] },
          { to: 'cerrado', action: 'confirmar', roles: ['direccion'] },
        ],
      },
      meta: { generated_at: '2026-01-01T00:00:00Z', etag: 'abc', trace_id: 't1' },
    };
  }

  public static screen(mutate?: (raw: Record<string, unknown>) => void): ScreenModel {
    const raw = SduiFixtures.rawScreen();
    mutate?.(raw);
    const result = ScreenParserFactory.create().parseScreen(raw);
    if (!result.ok || result.value === undefined) {
      throw new Error(`Fixture inválido: ${result.errors.map((error) => `${error.path} ${error.message}`).join('; ')}`);
    }
    return result.value;
  }
}
