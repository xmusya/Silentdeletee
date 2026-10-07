# SilentDelete

Vendetta-плагин: тихое удаление сообщений в Discord (мобильный) — обходит Vencord message loggers.

Форк [snipermaster226/Silentdeletee](https://github.com/snipermaster226/Silentdeletee), собран на шаблоне [Fierdetta/plugin-template](https://github.com/Fierdetta/plugin-template).

## Что изменено

- Убрана отдельная кнопка «Silent Delete» в меню долгого нажатия.
- Теперь плагин просто подменяет `onPress` родной кнопки **Delete** у Discord — выглядит и работает как обычная кнопка удаления, но удаляет тихо.

## Как это работает

Вместо обычного удаления плагин:
1. Отправляет сообщение-заменитель (по умолчанию `** **`) с флагом `SUPPRESS_NOTIFICATIONS`.
2. Ждёт настроенный интервал.
3. Удаляет замену и оригинал сообщения.

## Настройки

- **Replacement Text** — текст замена (по умолчанию `** **`)
- **Delete Delay** — задержка перед удалением, мс (по умолчанию `200`)
- **Suppress Notifications** — не пинговать упомянутых в замене
- **Delete Original Message** — удалять оригинал

## Установка

Ссылка на `index.js` из GitHub Pages вставляется в Plugins → Add Plugin:

```
https://xmusya.github.io/Silentdeletee/
```

## Сборка

```bash
npm install --legacy-peer-deps
node build.mjs
```

Результат в `dist/`. Автосборка и деплой на GitHub Pages — через `.github/workflows/deploy.yml` при пуше в `master`.

## Кредиты

- [snipermaster226](https://github.com/snipermaster226) — оригинальный плагин
- [Fierdetta/plugin-template](https://github.com/Fierdetta/plugin-template) — шаблон

- # НЕ РАБОТАЕТ!(не эдитит сообщение перед удалением)
