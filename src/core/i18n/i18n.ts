import i18n from "i18next";
import Backend from "i18next-fs-backend";
import { LanguageDetector } from "i18next-http-middleware";
import path from "path";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .init({
    fallbackLng: "en",
    preload: ["en", "ar"],
    backend: {
      loadPath: path.join(__dirname, "../locales/{{lng}}/translation.json"),
    },
    detection: {
      order: ["header", "querystring", "cookie"],
      caches: ["cookie"],
    },
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
