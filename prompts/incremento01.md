ÁMBITO
Workspace ai-labs abierto en su raíz. Trabaja únicamente en api/.
Lee AGENTS.md, README.md, RETO.md y docs/GOOD_PRACTICES.md desde la raíz.
Todas las rutas mencionadas parten de la raíz.
No leas ni modifiques auth/ ni web/. No cambies otros endpoints ni refactorices
el monolito. Git se ejecuta desde la raíz; ejecuta las pruebas desde api/ o
usa `python tools/lab.py test api` desde la raíz.

CONTEXTO
El endpoint POST /api/requirements ya existe en api/app/main.py. Actualmente
usa el nombre recibido para construir la ruta, lee el archivo completo en
memoria y responde con owner, fileName, storedAt y size. La prueba existente
de carga está en api/tests/test_api.py.
Verifica estos hechos en el código. RETO.md contiene candidatos, no hallazgos
confirmados. Si docs/ENDPOINTS.md no existe, indícalo y no inventes su contenido.

OBJETIVO
Preparar POST /api/requirements para que acepte archivos de requisitos de forma
controlada y segura, conservando el endpoint para que la interfaz pueda
integrarlo en un cambio posterior.

RESTRICCIONES
- Conserva POST /api/requirements, el código HTTP 201 en cargas correctas y las
  claves y tipos JSON actuales: owner, fileName, storedAt y size.
- Permite únicamente archivos .txt, .md y .pdf, sin confiar en el MIME enviado
  por el cliente. Usa un límite máximo de 5 MiB.
- Rechaza extensiones no permitidas y archivos que superen el límite con errores
  HTTP apropiados y mensajes que no expongan rutas ni excepciones internas.
- Impide traversal y colisiones: no uses el nombre recibido como ruta de
  almacenamiento; normaliza el nombre para mostrar y guarda con un identificador
  único dentro de upload_dir.
- Lee el contenido por bloques y detén la escritura al superar el límite.
  Elimina cualquier archivo parcial si la carga falla.
- Deriva owner de la identidad autenticada, nunca de datos proporcionados por
  el cliente.
- No agregues dependencias, endpoints ni cambios en la autenticación.
- Usa datos ficticios y almacenamiento temporal local en las pruebas. No pruebes
  contra servicios remotos.
- No reduzcas ni silencies quality gates. Busca una cobertura de 85% o superior
  para el código modificado; informa por separado cualquier gate de cobertura
  global que ejecute el proyecto.
- No crees ni reemplaces entregables generales del laboratorio. Si modificas
  evidencia existente, conserva su contenido y usa el siguiente ID H-API-NN
  disponible.

CRITERIOS DE ACEPTACIÓN
- Una carga válida de cada extensión permitida devuelve 201, conserva las claves
  y tipos de respuesta y guarda el archivo dentro de upload_dir.
- Una extensión no permitida y un archivo mayor de 5 MiB se rechazan con el
  código esperado y no dejan archivos guardados ni parciales.
- Un nombre con separadores de ruta no permite escribir fuera de upload_dir ni
  controla el nombre físico almacenado.
- La identidad de la respuesta corresponde al token autenticado.
- Las pruebas cubren carga válida, extensión rechazada, límite de tamaño,
  nombre con traversal, limpieza ante fallo y aislamiento local con tmp_path.
- Ejecuta las pruebas del componente API y reporta el comando, resultado y
  cobertura medida. No afirmes que una comprobación pasó si no la ejecutaste.

FORMATO DE RESPUESTA
Resume el comportamiento implementado y los archivos modificados.
Incluye una tabla: caso | resultado esperado | prueba ejecutada y resultado.
Indica los comandos ejecutados, la cobertura con numerador/denominador si está
disponible, lo que no se pudo comprobar y cualquier cambio semántico realizado
en fileName o storedAt.