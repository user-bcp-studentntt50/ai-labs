# Proposal

## Why

H-AUTH-03 (CONFIRMADO) — `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:22-24,32`. La tabla `legacy_users` guarda `password` en texto plano y el login la compara directamente; los usuarios sembrados (`student`, `trainer`) usan contraseñas conocidas. Si el archivo SQLite (`./data/workshop.db`) se filtra, todas las credenciales quedan expuestas.

## What Changes

- Las contraseñas dejan de almacenarse en una forma recuperable.
- El login con credenciales correctas sigue funcionando y las incorrectas siguen siendo rechazadas.
- Las bases ya creadas con contraseñas en texto plano no dejan a los usuarios sin acceso.
- **Dentro del alcance:** almacenamiento y verificación de contraseñas en `auth/` y sus pruebas.
- **Fuera del alcance:**
  - Cambios en `api/` o `web/`.
  - Formato del token (H-AUTH-02), consulta SQL (H-AUTH-01) y respuestas de error (H-AUTH-04).
  - Política de contraseñas, recuperación, rotación y alta de usuarios.
  - Elegir algoritmo, parámetros o librería: decisión del Architect.

## Contratos protegidos

- `POST /auth/login`: login válido responde 200 con `token` y `user`; credenciales incorrectas responden 401 sin `token`.
- Usuarios sembrados `student` / `Workshop123!` y `trainer` / `Trainer123!` siguen pudiendo iniciar sesión.
- Esquema base de `legacy_users` y variable `AUTH_DB_URL`. Si se necesita cambiar el esquema, es una decisión explícita.

## Capabilities

### New Capabilities
- `auth-credential-storage`: cómo se guardan y verifican las contraseñas de `legacy_users`.

### Modified Capabilities
- Ninguna.

## Impact

`auth/` (inicialización y consulta de `legacy_users`, pruebas). Interacción con H-AUTH-01: ambos cambian `findByCredentials`; conviene secuenciarlos para evitar conflictos.

## Preguntas abiertas (requieren decisión humana)

1. Para una base existente con contraseñas en texto plano: ¿se migran al primer arranque, al primer login correcto de cada usuario o se recrea la base? El comportamiento intermedio debe estar definido.
2. ¿Se aceptan dos usuarios con la misma contraseña y valores almacenados distintos entre sí? Se asume que sí (derivado de "hash lento con salt" en `RETO.md`, que es un objetivo de aprendizaje, no un requisito aprobado).
3. ¿Los usuarios sembrados mantienen contraseñas conocidas porque son solo de laboratorio? Debe quedar documentado.
