# Skill: Seleccion de atuendo diario

## Metadata
- **Proposito:** seleccionar un atuendo para el dia indicado, aprovechando el vestuario disponible y las preferencias proporcionadas.
- **Contexto requerido:**
  - Inventario vigente de prendas, clasificadas por temporada y estilo.
  - Preferencias de prendas por dia de la semana y modalidad (homeoffice o presencial).
  - Preferencias de combinaciones de colores por modalidad.
  - Calendario de vacaciones programadas.
- **Uso:** cuando se solicite una seleccion de ropa para hoy o para un dia/estilo especifico.
- **No usar para:** inventariar prendas, planificar compras o inferir condiciones no proporcionadas.

## Input
- Metadata de vestuario y preferencias descrita en `examples/input.atuendo.md`.
- Para la ejecucion: dia de la semana o estilo solicitado. Si no se conoce ni puede determinarse el dia de ejecucion, solicitarlo.

## Output
- Una seleccion de atuendo para el dia solicitado, usando exclusivamente prendas del inventario.
- Si faltan datos necesarios o hay preferencias incompatibles, indicar que falta y preguntar; no completar con prendas o reglas inventadas.
- Formato: `examples/output.atuendo.md`.

## Procedimiento
1. Leer la metadata disponible y el dia o estilo solicitado.
2. Identificar las prendas inventariadas que correspondan a la temporada y al estilo, si esos datos estan disponibles.
3. Aplicar las preferencias del dia, la modalidad y los colores cuando correspondan y esten definidas.
4. Consultar el calendario de vacaciones. No asumir que una fecha de vacaciones cambia la modalidad o las preferencias; pedir aclaracion si afecta la seleccion.
5. Seleccionar una sola combinacion utilizando solo prendas inventariadas. No inferir clima, disponibilidad, limpieza, ocasiones ni prendas faltantes.
6. Responder con la seleccion y una breve justificacion basada unicamente en la metadata. Si no es posible decidir, presentar la informacion faltante como pregunta abierta en vez de adivinar.

## Reglas para conflictos o datos incompletos
- Si no hay inventario suficiente para formar una seleccion o no se conoce la categoria necesaria, no inventar prendas; preguntar que dato falta.
- Si las preferencias por dia, modalidad, estilo o color se contradicen, no imponer una prioridad no declarada; exponer el conflicto y pedir una decision.
- Si la fecha solicitada coincide con vacaciones, considerar solo la informacion registrada y aclarar como debe tratarse esa fecha cuando sea relevante.
- No solicitar ni incluir datos personales que no sean necesarios para la seleccion.

## Prompt de ejemplo para ejecutar el Skill

> Usa la metadata de vestuario proporcionada en `examples/input.atuendo.md`. Selecciona un solo atuendo para hoy, martes. Respeta el inventario y las preferencias registradas; no inventes prendas, clima ni reglas. Si falta informacion necesaria o hay un conflicto, indicalo como pregunta abierta en lugar de decidir por mi. Devuelve la respuesta con el formato de `examples/output.atuendo.md`.