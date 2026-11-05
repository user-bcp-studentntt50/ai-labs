package pe.bcp.login.model;

# Inspección inicial del método y las pruebas (no sustituye la revisión del código).
cd auth
grep -nE 'findByCredentials|PreparedStatement|prepareStatement|setString|executeQuery' \
  src/main/java/com/bcp/workshop/auth/LegacyDatabase.java
grep -nE 'AuthResourceTest|OR .1.==.1|injection|inyecci' \
  src/test/java/com/bcp/workshop/auth/AuthResourceTest.java

# Prueba de regresión aislada.
mvn -Dtest=AuthResourceTest test

# Suite completa exigida por el criterio de aceptación.
mvn test