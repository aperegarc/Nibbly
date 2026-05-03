# Fuentes de datos de recetas (cumplimiento legal)

## TheMealDB (script `scripts/import-themealdb.mjs`)

- **Qué es:** base de datos comunitaria de comidas con API HTTP pública.
- **Uso en este proyecto:** el script importa metadatos (título, imagen, ingredientes, instrucciones resumidas) y guarda en tu Supabase:
  - `data_source_name = 'TheMealDB'`
  - `data_source_url = 'https://www.themealdb.com'`
- **App:** la ficha muestra “Fuente: TheMealDB” y permite abrir la URL de atribución.

### Tu responsabilidad

1. **Revisa los términos y la licencia actuales** en [themealdb.com](https://www.themealdb.com) y en su documentación de API antes de publicar en App Store o de usar la app con fines comerciales.
2. **No reempluye** este documento ni el aviso en la app por asesoramiento legal; si el volumen o el modelo de negocio lo requieren, consulta con un abogado.
3. **Alternativa 100 % bajo tu control:** carga solo recetas **propias** o con **licencia explícita** (texto/imagen) mediante SQL o un panel interno, sin usar TheMealDB.

## Traducción al español (script de importación)

- **Qué es:** el script puede llamar a una instancia de [LibreTranslate](https://libretranslate.com) para traducir título, pasos e instrucciones completas al español antes de guardarlas en Supabase (`full_instructions`, `quick_steps`, `title`).
- **Tu responsabilidad:** revisa la política de la instancia que uses; en volúmenes altos puede hacer falta API key propia o un servidor autohospedado. Variable opcional `LIBRETRANSLATE_API_KEY` y `LIBRETRANSLATE_URL`.
- **Sin traducción:** ejecuta el script con `--no-translate` para conservar el inglés de TheMealDB (útil si la API pública no responde).

## Clave `SUPABASE_SERVICE_ROLE_KEY`

- Solo en **tu ordenador** o CI privado para scripts de administración.
- **Nunca** en la app móvil ni en repositorios públicos.
