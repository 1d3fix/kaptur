import { db } from './schema';

export const DEFAULT_FILENAME_TEMPLATE = '{index}_{timestamp}';

export type BannerLocale = 'en' | 'fr';

export interface ExportSettings {
  fileNameTemplate: string;
}

const KEY_FILENAME_TEMPLATE = 'export.fileNameTemplate';
const KEY_BANNER_LOCALE = 'banner.locale';

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  if (!row) return fallback;
  return row.value as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getExportSettings(): Promise<ExportSettings> {
  return {
    fileNameTemplate: await getSetting<string>(
      KEY_FILENAME_TEMPLATE,
      DEFAULT_FILENAME_TEMPLATE,
    ),
  };
}

export async function setFileNameTemplate(template: string): Promise<void> {
  await setSetting(KEY_FILENAME_TEMPLATE, template);
}

export async function getBannerLocale(): Promise<BannerLocale> {
  return getSetting<BannerLocale>(KEY_BANNER_LOCALE, 'en');
}

export async function setBannerLocale(locale: BannerLocale): Promise<void> {
  await setSetting(KEY_BANNER_LOCALE, locale);
}
