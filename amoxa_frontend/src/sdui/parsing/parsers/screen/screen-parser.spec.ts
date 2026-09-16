import { InputGuard } from '@sdui-parsing-support/input-guard';
import { PathTokenizer } from '@sdui-path/path-tokenizer';
import { PathResolver } from '@sdui-path/path-resolver';
import { ConditionOperatorEvaluator } from '@sdui-condition/condition-operator-evaluator';
import { ConditionParser } from '@sdui-parsers/condition-parser';
import { ComponentParser } from '@sdui-parsers/component-parser';
import { ActionParser } from '@sdui-parsers-action/action-parser';
import { ActionMapParser } from '@sdui-parsers-action/action-map-parser';
import { RuleParser } from '@sdui-parsers/rule-parser';
import { StateTransitionParser } from '@sdui-parsers-state/state-transition-parser';
import { StateMachineParser } from '@sdui-parsers-state/state-machine-parser';
import { ScreenContextParser } from '@sdui-parsers-screen/screen-context-parser';
import { ScreenParser } from '@sdui-parsers-screen/screen-parser';
import { ComponentTraverser } from '@sdui-traversal/component-traverser';
import { ScreenModel } from '@sdui-model-screen/screen.model';

function createScreenParser(): ScreenParser {
  const guard = new InputGuard();
  const pathResolver = new PathResolver(new PathTokenizer());
  const operatorEvaluator = new ConditionOperatorEvaluator();
  const conditionParser = new ConditionParser(guard, pathResolver, operatorEvaluator);
  const componentParser = new ComponentParser(guard, conditionParser);
  const actionParser = new ActionParser(guard);
  const actionMapParser = new ActionMapParser(guard, actionParser);
  const ruleParser = new RuleParser(guard, conditionParser);
  const transitionParser = new StateTransitionParser(guard);
  const stateMachineParser = new StateMachineParser(guard, transitionParser);
  const contextParser = new ScreenContextParser(guard);

  return new ScreenParser(guard, contextParser, componentParser, actionMapParser, ruleParser, stateMachineParser);
}

function buildRawScreen(): unknown {
  return {
    version: '1.0',
    screen_id: 'auditoria.checklist',
    title: 'Checklist de auditoría',
    context: {
      user: { id: 'u1', rol: 'auditor' },
      entity: { type: 'AUDITORIA', id: 'a1', version: 3, estado: 'en_curso' },
      data: {
        respuestas: {
          q12: { resultado: 'NC' },
        },
      },
    },
    root: {
      type: 'section',
      id: 'root',
      children: [
        {
          type: 'checklist_item',
          id: 'q12',
          bind: 'respuestas[q12].resultado',
          visible_if: {
            all: [
              { field: 'user.rol', op: 'eq', value: 'auditor' },
              { not: { field: 'entity.estado', op: 'eq', value: 'cerrada' } },
            ],
          },
          children: [
            { type: 'evidence_capture', id: 'q12_evidencia', required: true },
          ],
        },
      ],
    },
    actions: {
      guardar: { type: 'submit', endpoint: '/auditorias/a1', method: 'PUT' },
    },
    rules: [
      {
        id: 'NC_REQUIERE_EVIDENCIA',
        when: { field: 'data.respuestas[q12].resultado', op: 'eq', value: 'NC' },
        message: 'Una no conformidad requiere evidencia',
        severity: 'block',
      },
    ],
  };
}

describe('ScreenParser', () => {
  it('parsea recursivamente un árbol de componentes y condiciones anidadas', () => {
    const result = createScreenParser().parseScreen(buildRawScreen());
    expect(result.ok).toBe(true);

    const screen = result.value as ScreenModel;
    expect(screen.root.children[0].children[0].type).toBe('evidence_capture');
    expect(screen.rules?.[0].when).toBeDefined();
  });

  it('acumula errores por ruta cuando el tipo de componente no existe', () => {
    const raw = buildRawScreen() as any;
    raw.root.children[0].type = 'not_a_real_type';

    const result = createScreenParser().parseScreen(raw);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === '$.root.children[0].type')).toBe(true);
  });

  it('evalúa condiciones anidadas (all/not) sobre el context', () => {
    const result = createScreenParser().parseScreen(buildRawScreen());
    const screen = result.value as ScreenModel;

    const visibleIf = screen.root.children[0].visibleIf;
    expect(visibleIf?.evaluate(screen.context)).toBe(true);
  });

  it('resuelve rutas con notación de corchetes no numéricos', () => {
    const resolver = new PathResolver(new PathTokenizer());
    const source = { respuestas: { q12: { resultado: 'NC' } } };
    expect(resolver.resolve(source, 'respuestas[q12].resultado')).toBe('NC');
  });

  it('recorre y busca en el árbol recursivamente', () => {
    const result = createScreenParser().parseScreen(buildRawScreen());
    const screen = result.value as ScreenModel;
    const traverser = new ComponentTraverser();

    const visited: string[] = [];
    traverser.walk(screen.root, (c) => visited.push(c.id));
    expect(visited).toEqual(['root', 'q12', 'q12_evidencia']);

    expect(traverser.findById(screen.root, 'q12_evidencia')?.type).toBe('evidence_capture');
    expect(traverser.collectBindPaths(screen.root)).toEqual(['respuestas[q12].resultado']);
  });
});
