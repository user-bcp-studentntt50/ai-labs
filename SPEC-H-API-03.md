# Consultas SQL seguras en la API

## Fuente

H-API-03 — **Filtros e inserts SQL concatenados**, aprobado por el usuario.

- **Evidencia:** valores de filtros, campos insertados y el ID usado para leer
  la fila nueva se formaban concatenando texto SQL. Evidencia histórica:
  `api/app/main.py:70,84,87,93`. La evidencia registrada posteriormente indica
  que filtros, inserciones y lookup por ID usan parámetros enlazados:
  `api/app/repositories.py:56-97`.
- **Impacto:** una entrada con caracteres SQL podía alterar consultas,
  exponer datos o cambiar la operación prevista.
- **Estado registrado:** resuelto en `HALLAZGOS.md` y `PLAN.md`. Esta spec
  formaliza el comportamiento esperado a partir del hallazgo aprobado; no
  implica que la corrección siga pendiente.

## Contexto actual

La API persiste y consulta tareas en SQLite. El hallazgo identificó que valores
de filtros, datos de inserción y el ID para recuperar una fila insertada se
incorporaban a las consultas mediante concatenación SQL. El registro actual
indica que esas operaciones ya utilizan parámetros enlazados.

## Problema confirmado

Los valores recibidos por la API no deben poder cambiar la estructura ni la
operación de una consulta SQL. El problema afecta la lectura filtrada, la
inserción de tareas y la recuperación de la fila creada.

## Comportamiento a preservar

- La lista de tareas, su orden, los valores predeterminados y las formas de
  respuesta observadas no cambian.
- Los datos enviados al crear una tarea se persisten y devuelven literalmente,
  incluidos valores que contienen comillas.
- Los filtros siguen restringiendo los resultados según el valor solicitado,
  sin alterar el significado de la consulta.
- La fila devuelta tras crear una tarea corresponde a la fila recién insertada.
- Las respuestas de la API conservan sus códigos y formatos actuales.

## Alcance

- Evitar que valores de filtros, campos insertados o identificadores usados en
  consultas se interpreten como fragmentos SQL.
- Cubrir la lectura filtrada, la creación de tareas y la recuperación de la
  fila creada.
- Verificar el comportamiento con datos que contienen comillas y con pruebas
  que fijen la lista inicial, la creación normal, el resumen, el orden y la
  serialización existentes.

## Fuera de alcance

- Cambiar rutas, métodos HTTP, autenticación, autorización, esquema de datos,
  valores predeterminados o formatos de respuesta.
- Resolver otros hallazgos de seguridad o realizar una refactorización general
  de la API.
- Cambiar la política funcional de filtros o los datos que la API permite
  almacenar.

## Criterios de aceptación

1. Los valores de filtros, inserciones e identificadores empleados para
   recuperar la fila insertada se procesan como valores y no como sintaxis SQL.
2. Una tarea cuyos datos incluyan comillas puede crearse, persistirse y
   devolverse literalmente, sin error ni alteración de la consulta.
3. Las consultas filtradas devuelven solo los resultados correspondientes al
   filtro solicitado.
4. Después de crear una tarea, la respuesta representa la fila recién creada.
5. Las pruebas de caracterización confirman que la lista inicial, la creación
   normal, el resumen, el orden y la serialización conservan el comportamiento
   observado.

## Contratos afectados/protegidos

- Conservar los endpoints y formatos que consume el frontend, en particular las
  operaciones de listado, creación y resumen de tareas afectadas por el
  almacenamiento y consulta.
- Mantener los códigos de éxito y las estructuras de respuesta actuales.
- Mantener la autorización vinculada a la identidad autenticada; esta spec no
  modifica reglas de acceso por propietario.

## Riesgos, supuestos y preguntas abiertas

- **Riesgo:** cambios en las consultas podrían alterar accidentalmente filtros,
  orden, valores predeterminados o serialización; las pruebas de
  caracterización deben detectarlo.
- **Supuesto:** el contrato observado en `HALLAZGOS.md` y las pruebas citadas en
  `PLAN.md` representan el comportamiento que debe conservarse.
- **Pregunta abierta:** ninguna para el alcance aprobado de H-API-03.
