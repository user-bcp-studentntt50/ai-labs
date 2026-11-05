# testing_report.md

## H-AUTH-05 — Restringir CORS de auth y revisar sus dependencias

**Fecha del informe:** 2026-11-05  
**Ejecución:** **NO EJECUTADO**. No se proporcionaron repositorio, entorno, configuración aprobada ni salidas de comandos.  
**Resultado de certificación:** **BLOQUEADO**. Este informe define pruebas reproducibles y resultados esperados; no afirma que la implementación cumpla.

## 1. Alcance y bloqueos

El brief identifica H-AUTH-05 como una tarea de CORS y dependencias de autenticación, pero no define criterios formales ni especifica:

- Orígenes permitidos, rutas de auth, métodos, cabeceras o política de credenciales.
- Manifiestos, versiones o dependencias concretas que revisar.
- Contrato de persistencia asociado a la autenticación.

El historial también contiene una propuesta de transferencias entre cuentas. Esa propuesta **no coincide con H-AUTH-05** y sus criterios están pendientes de aprobación. Se conserva al final como trazabilidad, no como alcance aprobado.

El fragmento Angular proporcionado valida una URL base del cliente; **no configura ni verifica la política CORS del servidor**. No se proporcionaron el proyecto ni el código del servidor para comprobar la corrección.

## 2. Criterios y trazabilidad

Los siguientes criterios H-AUTH-05 son **objetivos de prueba propuestos**, derivados del título y de la nota de Arquitectura; no son criterios formalmente aprobados.

| ID | Criterio / prueba | Resultado esperado | Resultado real |
|---|---|---|---|
| H05-CORS-01 | Preflight desde un origen permitido, con método y cabeceras aprobados. | `Access-Control-Allow-Origin` coincide exactamente con el origen; método y cabeceras solicitados están autorizados según la política aprobada. | **NO EJECUTADO** |
| H05-CORS-02 | Preflight desde un origen no permitido. | No se devuelve `Access-Control-Allow-Origin: *` ni una autorización que coincida con el origen no permitido. | **NO EJECUTADO** |
| H05-CORS-03 | Probar un origen limítrofe no permitido: por ejemplo, subdominio parecido, esquema o puerto distinto. | La política no confunde el origen con uno permitido; no se autoriza el origen limítrofe. | **NO EJECUTADO** |
| H05-CORS-04 | Preflight con método o cabecera no permitidos. | La respuesta no autoriza el método o la cabecera solicitados. El código HTTP exacto debe acordarse con el contrato. | **NO EJECUTADO** |
| H05-CORS-05 | Verificar credenciales según la política aprobada. | Si se permiten credenciales, `Access-Control-Allow-Credentials: true` y un origen explícito exacto; nunca `*` junto con credenciales. | **NO EJECUTADO** |
| H05-DEP-01 | Inventariar manifiestos, lockfiles y dependencias de auth directas y transitivas. | Se documentan paquete, versión resuelta, origen, uso en auth y evidencia de revisión. | **NO EJECUTADO** |
| H05-DEP-02 | Ejecutar la revisión de vulnerabilidades apropiada para los manifiestos reales. | Se conserva la salida de la herramienta y se documentan hallazgos y acciones aprobadas, sin actualizar dependencias fuera del alcance autorizado. | **NO EJECUTADO** |

**Nota de seguridad:** CORS controla si un navegador permite que una página lea una respuesta; no sustituye autenticación ni autorización. Un cliente que no sea navegador puede enviar solicitudes sin respetar CORS. Las pruebas siguientes usan `OPTIONS` y no envían credenciales ni ejecutan operaciones de negocio.

### Casos CORS incluidos

| Caso | Tipo | Preparación y datos | Resultado esperado |
|---|---|---|---|
| CORS-01 — origen permitido | Positivo / integración | Servicio de staging; ruta de auth y origen permitidos aprobados; método y cabeceras preflight válidos. | Preflight 2xx y `Access-Control-Allow-Origin` exactamente igual al origen. Se autorizan el método y las cabeceras esperados. |
| CORS-02 — origen rechazado | Negativo / integración | Mismo servicio y ruta; usar un origen no incluido en la allowlist. | No se autoriza ese origen; en particular, no se devuelve `*`. El código HTTP puede depender del servidor. |
| CORS-03 — origen limítrofe | Borde / integración | Usar un origen no permitido parecido al autorizado, por ejemplo, otro subdominio o puerto. | No se autoriza por coincidencia parcial con el origen permitido. |
| CORS-04 — método no permitido | Negativo / borde | Origen permitido y método que la política aprobada excluye. | La respuesta no incluye una autorización efectiva para ese método. |
| CORS-05 — cabecera no permitida | Negativo / borde | Origen y método permitidos; solicitar una cabecera que la política excluye. | La respuesta no autoriza esa cabecera. |
| CORS-06 — credenciales | Positivo / configuración | Definir explícitamente si la política permite credenciales. No enviar credenciales reales. | Si están habilitadas, el origen debe ser explícito y no `*`; el valor de `Access-Control-Allow-Credentials` coincide con la política. |

La prueba CORS propuesta cubre preflight HTTP mediante `curl`. No prueba por sí sola el comportamiento completo de un navegador ni demuestra que una petición no llegue al servidor.

## 3. Persistencia y contratos

No se proporcionó un contrato de persistencia para H-AUTH-05, un esquema, migraciones ni implementación que inspeccionar. Por tanto:

- No se puede certificar un contrato de persistencia ni afirmar que no haya cambios en la base de datos.
- Un preflight `OPTIONS` debería no ejecutar una operación de negocio, pero demostrar ausencia de escrituras requiere un entorno de integración con acceso a una medición de persistencia aprobada.
- No se deben inventar tablas, saldos, sesiones ni escrituras esperadas.
- La revisión de cambios debe comprobar que no haya migraciones o modificaciones de persistencia inesperadas para este alcance.

## 4. Revisión de dependencias

No se proporcionaron manifiestos ni lockfiles. Los comandos siguientes son condicionales: ejecutar únicamente los que correspondan a los archivos reales del proyecto, en un checkout de prueba y con las herramientas aprobadas. No se ejecutaron.

### Inventario inicial

```bash
git status --short
find . -type f \( \
  -name 'package.json' -o -name 'package-lock.json' -o \
  -name 'npm-shrinkwrap.json' -o -name 'yarn.lock' -o \
  -name 'pnpm-lock.yaml' -o -name 'requirements.txt' -o \
  -name 'pyproject.toml' -o -name 'poetry.lock' -o \
  -name 'uv.lock' -o -name 'Pipfile' -o -name 'Pipfile.lock' \
\) -not -path '*/node_modules/*' -not -path '*/.venv/*' -print
```

### Comandos condicionales de revisión

Con `package-lock.json` y npm:

```bash
npm audit --omit=dev
npm ls --omit=dev --all
```

Con un `requirements.txt` que represente las dependencias aprobadas:

```bash
python -m pip_audit -r requirements.txt
```

La disponibilidad de `pip-audit`, la selección de los archivos y el alcance de dependencias deben verificarse antes de ejecutar. Si se usa otra herramienta o lockfile, seguir el procedimiento aprobado para ese gestor. Una auditoría automatizada no reemplaza identificar cuáles dependencias se usan en auth ni acordar las acciones.

**Limpieza:** los comandos anteriores no instalan ni actualizan paquetes. Si se guardan salidas como evidencia, conservarlas en el sistema de evidencias del cambio; no borrar evidencia de auditoría. No limpiar logs de seguridad.

## 5. Comprobaciones del fragmento Angular propuesto

Estas son comprobaciones de diseño para `AuthApiConfigService`, no pruebas ejecutadas contra una aplicación. La falta de proyecto Angular y de configuración de pruebas impide aportar comandos de test unitario ejecutables.

| Caso | Tipo | Entrada de prueba | Resultado esperado |
|---|---|---|---|
| UI-CFG-01 | Positivo | URL absoluta HTTPS, sin credenciales, query ni fragmento. | Aceptada; conserva origen y ruta y elimina barras finales de la ruta. |
| UI-CFG-02 | Positivo / borde | URL HTTP o HTTPS con una o varias barras finales. | Aceptada según el contrato de configuración; ruta normalizada sin barras finales. |
| UI-CFG-03 | Negativo | URL ausente, vacía, con espacios exteriores o relativa. | Se rechaza con error de configuración. |
| UI-CFG-04 | Negativo | URL que contiene `*`. | Se rechaza; esto solo valida la URL configurada en el cliente, no la allowlist CORS del servidor. |
| UI-CFG-05 | Negativo | URL con usuario o contraseña. | Se rechaza. |
| UI-CFG-06 | Negativo | URL con query, fragmento o protocolo distinto de HTTP/HTTPS. | Se rechaza. |

Para certificar estas correcciones hacen falta las pruebas del repositorio y una prueba HTTP contra el servidor. La validación de URL del cliente no demuestra que el servidor rechace orígenes no autorizados.

## 6. Comandos reproducibles de la prueba CORS

Se entrega el script `tests/test_auth_cors.sh` a continuación. Debe guardarse exactamente con ese nombre. Los valores son de ejemplo: reemplazarlos por valores de un entorno **no productivo**, la ruta real y la política aprobada. No ejecutar contra producción ni mientras los valores estén sin confirmar.

Preparación:

1. Usar un servicio de auth de staging accesible desde el entorno de ejecución.
2. Obtener de API/Security el origen permitido, uno no permitido, uno limítrofe, la ruta, método, cabeceras y política de credenciales.
3. No usar credenciales reales. El script solo envía preflights `OPTIONS`.
4. Configurar y ejecutar:

```bash
mkdir -p tests
chmod +x tests/test_auth_cors.sh

export AUTH_BASE_URL='https://auth-staging.example.test'
export AUTH_PATH='/ruta-de-auth-aprobada'
export CORS_ALLOWED_ORIGIN='https://app-staging.example.test'
export CORS_DENIED_ORIGIN='https://origen-no-permitido.invalid'
export CORS_BOUNDARY_ORIGIN='https://app-staging.example.test.evil.invalid'
export CORS_ALLOWED_METHOD='POST'
export CORS_ALLOWED_HEADERS='authorization,content-type'
export CORS_DENIED_METHOD='PATCH'
export CORS_DENIED_HEADER='x-header-no-permitida'
export CORS_EXPECT_CREDENTIALS='false'

./tests/test_auth_cors.sh
```

Los valores de ejemplo no constituyen una política aprobada. Cambiar `CORS_EXPECT_CREDENTIALS` a `true` solo si esa política fue aprobada. Elegir método y cabecera de prueba denegados después de confirmar que realmente están fuera de la allowlist.

**Resultado esperado al ejecutar:** el script termina con código cero solo si pasan sus aserciones; cualquier fallo se informa en la salida. Esta salida todavía no existe; la ejecución queda **NO EJECUTADA**.

**Limpieza:** el script borra automáticamente sus archivos temporales al terminar. No crea datos de negocio ni requiere limpiar la base de datos. Conservar, si se requiere, la salida de ejecución como evidencia. No eliminar logs de seguridad.

## 7. Casos de transferencia de la propuesta anterior — fuera de alcance

Los criterios siguientes proceden de una propuesta marcada como pendiente de aprobación. No forman parte de un contrato aprobado para H-AUTH-05 y no deben implementarse ni certificarse como tales. Se incluyen para que la discrepancia de alcance no quede oculta.

| Criterio propuesto | Prueba candidata y resultado esperado | Preparación / datos | Resultado real |
|---|---|---|---|
| TR-01 Propiedad de cuentas | Positivo: ambas cuentas del cliente autenticado permiten una transferencia válida. Negativo: una cuenta de otro cliente se rechaza con el código acordado y sin cambios de saldos. | Cuentas de prueba segregadas por titular; token de prueba. Definir si se devuelve 403 o 404. | **NO EJECUTADO — fuera de alcance y contrato pendiente** |
| TR-02 Cuentas distintas y activas | Negativo: misma cuenta o cuenta inactiva se rechaza sin modificar saldos. | Datos de prueba con dos cuentas; cuenta inactiva preparada en fixture. | **NO EJECUTADO — fuera de alcance y contrato pendiente** |
| TR-03 Fondos y moneda | Positivo: saldo suficiente y moneda admitida. Negativo/borde: saldo insuficiente, incluida diferencia mínima admitida, o moneda no admitida. | Precisar escala monetaria y saldo disponible con el equipo de dominio. | **NO EJECUTADO — fuera de alcance y reglas pendientes** |
| TR-04 Límites | Borde: exactamente en el límite permitido. Negativo: excederlo por la unidad mínima. | Límite y periodo aplicables por definir. | **NO EJECUTADO — fuera de alcance y límites pendientes** |
| TR-05 Atomicidad | Integración: inyectar fallo en débito, crédito o persistencia; verificar que no quede aplicado solo uno de los movimientos. | Entorno de integración, mecanismo de fallo y contrato transaccional aprobados. | **NO EJECUTADO — fuera de alcance y persistencia no definida** |
| TR-06 Idempotencia | Integración: repetir la misma clave y contenido y comprobar una sola transferencia y resultado original; reutilizar la clave con contenido diferente y comprobar rechazo. Incluir repetición concurrente si se aprueba. | Definir formato, retención, almacenamiento y semántica HTTP de la clave. | **NO EJECUTADO — fuera de alcance y contrato pendiente** |
| TR-07 Formato monetario | Positivo: string decimal válido. Negativo: número JSON, exponente o formato inválido. Borde: escala permitida y una fracción adicional. | Definir escala por moneda y formato admitido. | **NO EJECUTADO — fuera de alcance y reglas pendientes** |

Si la transferencia sigue siendo necesaria, debe aprobarse como alcance separado con contrato de API, errores, persistencia, límites e idempotencia definidos antes de implementar o ejecutar estas pruebas.

## 8. Script entregado: `tests/test_auth_cors.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

info() {
  printf '%s\n' "$*"
}

required_vars=(
  AUTH_BASE_URL
  AUTH_PATH
  CORS_ALLOWED_ORIGIN
  CORS_DENIED_ORIGIN
  CORS_BOUNDARY_ORIGIN
  CORS_ALLOWED_METHOD
  CORS_ALLOWED_HEADERS
  CORS_DENIED_METHOD
  CORS_DENIED_HEADER
  CORS_EXPECT_CREDENTIALS
)

for name in "${required_vars[@]}"; do
  [[ -n "${!name:-}" ]] || fail "Falta la variable requerida: $name"
done

[[ "$AUTH_PATH" == /* ]] || fail "AUTH_PATH debe comenzar con /"
[[ "$CORS_EXPECT_CREDENTIALS" == "true" || \
   "$CORS_EXPECT_CREDENTIALS" == "false" ]] ||
  fail "CORS_EXPECT_CREDENTIALS debe ser true o false"

[[ "$CORS_ALLOWED_ORIGIN" != "$CORS_DENIED_ORIGIN" ]] ||
  fail "El origen permitido y el denegado deben ser distintos"
[[ "$CORS_ALLOWED_ORIGIN" != "$CORS_BOUNDARY_ORIGIN" ]] ||
  fail "El origen limítrofe debe ser distinto del permitido"
[[ "$CORS_DENIED_ORIGIN" != "$CORS_BOUNDARY_ORIGIN" ]] ||
  fail "El origen limítrofe debe ser distinto del denegado"

URL="${AUTH_BASE_URL%/}${AUTH_PATH}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

LAST_HEADERS=''
LAST_STATUS=''

header_count() {
  local file="$1"
  local wanted="$2"

  awk -v wanted="$wanted" '
    BEGIN { count = 0 }
    {
      line = $0
      sub(/\r$/, "", line)
      colon = index(line, ":")
      if (colon > 0) {
        name = substr(line, 1, colon - 1)
        if (tolower(name) == tolower(wanted)) count++
      }
    }
    END { print count }
  ' "$file"
}

header_value() {
  local file="$1"
  local wanted="$2"

  awk -v wanted="$wanted" '
    {
      line = $0
      sub(/\r$/, "", line)
      colon = index(line, ":")
      if (colon > 0) {
        name = substr(line, 1, colon - 1)
        if (tolower(name) == tolower(wanted)) {
          value = substr(line, colon + 1)
          sub(/^[ \t]+/, "", value)
          sub(/[ \t]+$/, "", value)
          found = value
        }
      }
    }
    END { if (found != "") print found }
  ' "$file"
}

request_preflight() {
  local label="$1"
  local origin="$2"
  local method="$3"
  local requested_headers="$4"
  local file="$TMP_DIR/headers-$RANDOM"

  local -a args=(
    -sS
    --max-time "${CURL_MAX_TIME:-15}"
    -X OPTIONS
    -D "$file"
    -o /dev/null
    -w '%{http_code}'
    -H "Origin: $origin"
    -H "Access-Control-Request-Method: $method"
  )

  if [[ -n "$requested_headers" ]]; then
    args+=(-H "Access-Control-Request-Headers: $requested_headers")
  fi

  local status
  status="$(curl "${args[@]}" "$URL")" ||
    fail "$label: curl no pudo completar la solicitud"

  LAST_HEADERS="$file"
  LAST_STATUS="$status"
  info "$label: HTTP $status"
}

assert_2xx() {
  [[ "$LAST_STATUS" =~ ^2[0-9][0-9]$ ]] ||
    fail "Se esperaba una respuesta 2xx; se recibió HTTP $LAST_STATUS"
}

token_in_list() {
  local list="$1"
  local token="$2"

  printf '%s\n' "$list" |
    tr ',' '\n' |
    sed 's/^[[:space:]]*//; s/[[:space:]]*$//' |
    grep -Fxi -- "$token" >/dev/null
}

assert_allow_origin_exact() {
  local expected="$1"
  local count
  local actual

  count="$(header_count "$LAST_HEADERS" 'Access-Control-Allow-Origin')"
  [[ "$count" == "1" ]] ||
    fail "Se esperaba exactamente una cabecera Access-Control-Allow-Origin; se recibió $count"

  actual="$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Origin')"
  [[ "$actual" == "$expected" ]] ||
    fail "Access-Control-Allow-Origin esperado '$expected', recibido '$actual'"
}

assert_origin_not_authorized() {
  local tested_origin="$1"
  local count
  local actual

  count="$(header_count "$LAST_HEADERS" 'Access-Control-Allow-Origin')"
  [[ "$count" -le "1" ]] ||
    fail "Respuesta con más de una cabecera Access-Control-Allow-Origin"

  actual="$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Origin')"

  [[ "$actual" != "*" ]] ||
    fail "El origen no permitido '$tested_origin' recibió autorización wildcard"
  [[ "$actual" != "$tested_origin" ]] ||
    fail "El origen no permitido '$tested_origin' fue autorizado"

  info "OK: el origen '$tested_origin' no fue autorizado"
}

assert_token_granted() {
  local header_name="$1"
  local list="$2"
  local token="$3"
  local wildcard_is_effective="$4"

  if token_in_list "$list" "$token"; then
    return 0
  fi

  if [[ "$wildcard_is_effective" == "true" ]] &&
     token_in_list "$list" '*'; then
    return 0
  fi

  fail "$header_name no autoriza '$token'; valor recibido: '$list'"
}

assert_token_not_granted() {
  local header_name="$1"
  local list="$2"
  local token="$3"
  local wildcard_is_effective="$4"

  if token_in_list "$list" "$token"; then
    fail "$header_name autoriza inesperadamente '$token'"
  fi

  if [[ "$wildcard_is_effective" == "true" ]] &&
     token_in_list "$list" '*'; then
    fail "$header_name contiene un wildcard que autoriza '$token'"
  fi

  info "OK: $header_name no autoriza '$token'"
}

# CORS-01: preflight permitido con el origen, método y cabeceras aprobados.
request_preflight \
  'CORS-01 origen permitido' \
  "$CORS_ALLOWED_ORIGIN" \
  "$CORS_ALLOWED_METHOD" \
  "$CORS_ALLOWED_HEADERS"
assert_2xx
assert_allow_origin_exact "$CORS_ALLOWED_ORIGIN"

allowed_methods="$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Methods')"
assert_token_granted \
  'Access-Control-Allow-Methods' \
  "$allowed_methods" \
  "$CORS_ALLOWED_METHOD" \
  "$([[ "$CORS_EXPECT_CREDENTIALS" == "false" ]] && echo true || echo false)"

allowed_headers="$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Headers')"
IFS=',' read -r -a requested_headers_array <<< "$CORS_ALLOWED_HEADERS"
for requested_header in "${requested_headers_array[@]}"; do
  requested_header="$(printf '%s' "$requested_header" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  [[ -n "$requested_header" ]] || continue
  assert_token_granted \
    'Access-Control-Allow-Headers' \
    "$allowed_headers" \
    "$requested_header" \
    "$([[ "$CORS_EXPECT_CREDENTIALS" == "false" ]] && echo true || echo false)"
done

allow_credentials="$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Credentials')"
if [[ "$CORS_EXPECT_CREDENTIALS" == "true" ]]; then
  [[ "${allow_credentials,,}" == "true" ]] ||
    fail "Se esperaban credenciales permitidas; recibido '$allow_credentials'"
  [[ "$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Origin')" != "*" ]] ||
    fail "No se permite wildcard con credenciales"
else
  [[ "${allow_credentials,,}" != "true" ]] ||
    fail "La política indica sin credenciales, pero el servidor devuelve true"
fi
info 'OK: política de credenciales conforme a la expectativa configurada'

# CORS-02: origen explícitamente no permitido.
request_preflight \
  'CORS-02 origen denegado' \
  "$CORS_DENIED_ORIGIN" \
  "$CORS_ALLOWED_METHOD" \
  "$CORS_ALLOWED_HEADERS"
[[ "$LAST_STATUS" != "000" ]] ||
  fail 'CORS-02: no se obtuvo una respuesta HTTP'
assert_origin_not_authorized "$CORS_DENIED_ORIGIN"

# CORS-03: origen limítrofe no permitido.
request_preflight \
  'CORS-03 origen limítrofe' \
  "$CORS_BOUNDARY_ORIGIN" \
  "$CORS_ALLOWED_METHOD" \
  "$CORS_ALLOWED_HEADERS"
[[ "$LAST_STATUS" != "000" ]] ||
  fail 'CORS-03: no se obtuvo una respuesta HTTP'
assert_origin_not_authorized "$CORS_BOUNDARY_ORIGIN"

# CORS-04: método que debe estar excluido de la política aprobada.
request_preflight \
  'CORS-04 método no permitido' \
  "$CORS_ALLOWED_ORIGIN" \
  "$CORS_DENIED_METHOD" \
  ''
methods_for_denied_test="$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Methods')"
assert_token_not_granted \
  'Access-Control-Allow-Methods' \
  "$methods_for_denied_test" \
  "$CORS_DENIED_METHOD" \
  "$([[ "$CORS_EXPECT_CREDENTIALS" == "false" ]] && echo true || echo false)"

# CORS-05: cabecera que debe estar excluida de la política aprobada.
request_preflight \
  'CORS-05 cabecera no permitida' \
  "$CORS_ALLOWED_ORIGIN" \
  "$CORS_ALLOWED_METHOD" \
  "$CORS_DENIED_HEADER"
headers_for_denied_test="$(header_value "$LAST_HEADERS" 'Access-Control-Allow-Headers')"
assert_token_not_granted \
  'Access-Control-Allow-Headers' \
  "$headers_for_denied_test" \
  "$CORS_DENIED_HEADER" \
  "$([[ "$CORS_EXPECT_CREDENTIALS" == "false" ]] && echo true || echo false)"

info 'Pruebas CORS completadas: todas las aserciones pasaron.'
```

## 9. Estado final y criterios para desbloquear

**No se certifica el cambio.** Todas las pruebas están **NO EJECUTADAS**; no hay resultados reales ni evidencia de que el servicio o las dependencias cumplan.

Para desbloquear la ejecución y emitir una conclusión hacen falta:

1. Criterios H-AUTH-05 aprobados por API/Security.
2. Allowlist por entorno, ruta, métodos, cabeceras y política de credenciales.
3. Repositorio y manifiestos/lockfiles de las dependencias reales.
4. Entorno de staging accesible y valores de prueba aprobados.
5. Contrato de persistencia, solo si el cambio modifica o debe certificar ese comportamiento.
6. Confirmación de si la transferencia es un alcance separado; no asumir que pertenece a H-AUTH-05.