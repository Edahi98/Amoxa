import type { ActionMethod } from '@sdui/sdui-enums.js';
import { ActionBuilder } from '@sdui-builder/action-builder.js';
import type { ScreenBuilder } from '@sdui-builder-screen/screen-builder.js';

export class ActionKit {
  public static navId(screenId: string): string {
    return `ir_${screenId.replaceAll('.', '_')}`;
  }

  public static navigate(screenId: string, params?: Record<string, unknown>): ActionBuilder {
    return ActionBuilder.of('navigate').screen(screenId, params);
  }

  public static registerNavigation(builder: ScreenBuilder, ...screenIds: string[]): void {
    for (const screenId of screenIds) {
      builder.action(ActionKit.navId(screenId), ActionKit.navigate(screenId));
    }
  }

  public static submit(method: ActionMethod, endpoint: string, ...ruleIds: string[]): ActionBuilder {
    return ActionKit.withRules(ActionBuilder.of('submit').request(method, endpoint), ruleIds);
  }

  public static callApi(method: ActionMethod, endpoint: string, ...ruleIds: string[]): ActionBuilder {
    return ActionKit.withRules(ActionBuilder.of('call_api').request(method, endpoint), ruleIds);
  }

  public static refresh(): ActionBuilder {
    return ActionBuilder.of('refresh');
  }

  public static syncNow(): ActionBuilder {
    return ActionBuilder.of('sync_now');
  }

  public static captureMedia(): ActionBuilder {
    return ActionBuilder.of('capture_media');
  }

  public static confirm(text: string): ActionBuilder {
    return ActionBuilder.of('confirm').confirmText(text);
  }

  public static toast(message: string): ActionBuilder {
    return ActionBuilder.of('toast').payload({ message });
  }

  public static logout(): ActionBuilder {
    return ActionBuilder.of('logout');
  }

  private static withRules(action: ActionBuilder, ruleIds: string[]): ActionBuilder {
    return ruleIds.length === 0 ? action : action.requiresRules(...ruleIds);
  }
}
