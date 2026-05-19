import {
  SUPPORTED_LANGUAGE_CODES,
  useLanguageStore,
} from '../store/useLanguageStore';
import type { UiAction } from '../types/cart';

export function applyUiAction(ui_action?: UiAction | null): void {
  if (ui_action?.type !== 'change_language') {
    return;
  }

  const code = ui_action.languageCode;
  if (!(SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code)) {
    return;
  }

  useLanguageStore.getState().setLanguage(code);
}
