# Smart Recipe Scroll - Arquitectura (Paso 1)

## Estructura

- `app/`: inicializacion global, providers y composicion raiz.
- `domain/`: entidades y contratos de negocio.
- `application/`: casos de uso y orquestacion.
- `infrastructure/`: implementaciones externas (Supabase, API AI, storage).
- `presentation/`: pantallas, componentes y tema de UI.
- `shared/`: tipos y utilidades transversales.

## Convenciones

- El `domain` no depende de otras capas.
- `application` depende de `domain`.
- `infrastructure` implementa contratos de `domain`.
- `presentation` consume casos de uso de `application`.
