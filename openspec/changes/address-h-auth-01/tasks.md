## 1. Pruebas de caracterización (comportamiento a preservar)

Archivo: `auth/src/test/java/com/bcp/workshop/auth/AuthResourceTest.java`. No se modifica código de `auth/src/main/`.

- [x] 1.1 Añadir prueba de login válido de `trainer` (`trainer` / `Trainer123!`): 200, `user.username = trainer`, `token` no nulo.
- [x] 1.2 Añadir prueba de la forma de la respuesta válida de `student`: `expiresIn = 3600`, `user.role` y `user.displayName` presentes.
- [x] 1.3 Añadir prueba de contraseña incorrecta (`student` / `wrong`): 401 y sin `token`.
- [x] 1.4 Añadir prueba de usuario inexistente (`nobody` / `x`): 401 y sin `token`.
- [x] 1.5 Añadir pruebas de validación previa: usuario en blanco, contraseña en blanco y campos ausentes devuelven 400.
- [x] 1.6 Ejecutar `python tools/lab.py test auth` desde la raíz y confirmar que 1.1 a 1.5 pasan con el código actual.

## 2. Pruebas de rechazo de inyección (reproducción previa al arreglo)

- [x] 2.1 Añadir escenario de la spec "valor de inyección como usuario": `' OR '1'='1` como usuario y contraseña no vacía, 401 y sin `token`.
- [x] 2.2 Añadir escenario de la spec "valor de inyección como contraseña": `student` con `' OR '1'='1` como contraseña, 401 y sin `token`.
- [x] 2.3 Añadir variante con inyección en ambos campos (`' OR '1'='1` / `' OR '1'='1`): 401 y sin `token`.
- [x] 2.4 Añadir variante con comentario SQL (`' OR '1'='1' --` como usuario, contraseña no vacía): 401 y sin `token`.
- [x] 2.5 Ejecutar `python tools/lab.py test auth` antes del cambio funcional y registrar que 2.2, 2.3 y 2.4 fallan (200 con `token`) como evidencia de reproducción de H-AUTH-01; 2.1 puede pasar hoy según el análisis del diseño.
- [x] 2.6 Confirmar que el login válido y las pruebas de la sección 1 siguen pasando.

## 3. Implementación incremental

Archivo: `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java`. Solo se modifica `findByCredentials`.

- [ ] 3.1 Reemplazar la concatenación de `username` y `password` por una consulta parametrizada (`PreparedStatement` con `WHERE username = ? AND password = ?`) enlazando ambos valores con `setString`.
- [ ] 3.2 Conservar `DB_URL`, las columnas seleccionadas, el mapeo a `UserRecord`, el retorno `null` sin coincidencia y el manejo actual de excepciones.
- [ ] 3.3 Confirmar que no cambian `AuthResource`, `LegacyTokenUtil`, `LoginRequest`, `UserRecord`, `application.properties`, `pom.xml` ni ningún archivo fuera de `auth/`.

## 4. Validación

- [ ] 4.1 Ejecutar `python tools/lab.py test auth` y confirmar que pasan todas las pruebas de las secciones 1 y 2.
- [ ] 4.2 Revisar el reporte JaCoCo de `auth/` y confirmar cobertura de 85% o más sobre `findByCredentials`; si el bloque `catch` queda sin cubrir, evaluar una prueba directa en `LegacyDatabaseTest` antes de aceptar el hueco.
- [ ] 4.3 Contrastar cada escenario de `specs/auth-login/spec.md` con su prueba y confirmar que los tres están cubiertos.
- [ ] 4.4 Verificar con `git diff` desde la raíz que el cambio se limita a `auth/` y a los artefactos de `openspec/changes/address-h-auth-01/`.

## 5. Cierre

- [ ] 5.1 Separar commits: pruebas (secciones 1 y 2) y cambio funcional (sección 3), para permitir `git revert` del segundo sin afectar las pruebas.
- [ ] 5.2 Preparar la descripción del PR con referencia al Issue #23 y H-AUTH-01, la evidencia de pruebas antes y después y la cobertura obtenida, indicando los riesgos residuales no abordados (contraseñas en texto plano, token sin firma, mensaje 401 que refleja `username`).
