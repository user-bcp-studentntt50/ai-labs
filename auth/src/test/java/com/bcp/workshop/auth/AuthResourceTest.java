package com.bcp.workshop.auth;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class AuthResourceTest {
    private static final String INJECTION_VALUE = "' OR '1'='1";

    @Test
    void logsInWithWorkshopUser() {
        given()
                .contentType("application/json")
                .body("{\"username\":\"student\",\"password\":\"Workshop123!\",\"client\":\"angular-workshop\"}")
                .when().post("/auth/login")
                .then()
                .statusCode(200)
                .body("user.username", is("student"))
                .body("token", notNullValue());
    }

    @Test
    @DisplayName("Login válido del usuario sembrado trainer responde 200 con token")
    void logsInWithTrainerUser() {
        login(Map.of("username", "trainer", "password", "Trainer123!"))
                .statusCode(200)
                .body("user.username", is("trainer"))
                .body("token", notNullValue());
    }

    @Test
    @DisplayName("La respuesta del login válido conserva expiresIn, user.role y user.displayName")
    void keepsValidLoginResponseShape() {
        login(Map.of("username", "student", "password", "Workshop123!"))
                .statusCode(200)
                .body("expiresIn", is(3600))
                .body("user.role", is("STUDENT"))
                .body("user.displayName", is("Workshop Student"));
    }

    @Test
    @DisplayName("Contraseña incorrecta responde 401 sin token")
    void rejectsWrongPassword() {
        login(Map.of("username", "student", "password", "wrong"))
                .statusCode(401)
                .body("token", nullValue());
    }

    @Test
    @DisplayName("Usuario inexistente responde 401 sin token")
    void rejectsUnknownUser() {
        login(Map.of("username", "nobody", "password", "x"))
                .statusCode(401)
                .body("token", nullValue());
    }

    @Test
    @DisplayName("Usuario en blanco responde 400 con su mensaje actual")
    void rejectsBlankUsername() {
        login(Map.of("username", "   ", "password", "Workshop123!"))
                .statusCode(400)
                .body("message", is("Username is required"));
    }

    @Test
    @DisplayName("Contraseña en blanco responde 400 con su mensaje actual")
    void rejectsBlankPassword() {
        login(Map.of("username", "student", "password", "   "))
                .statusCode(400)
                .body("message", is("Password is required"));
    }

    @Test
    @DisplayName("Usuario ausente responde 400 con su mensaje actual")
    void rejectsMissingUsername() {
        login(Map.of("password", "Workshop123!"))
                .statusCode(400)
                .body("message", is("Username is required"));
    }

    @Test
    @DisplayName("Contraseña ausente responde 400 con su mensaje actual")
    void rejectsMissingPassword() {
        login(Map.of("username", "student"))
                .statusCode(400)
                .body("message", is("Password is required"));
    }

    @Test
    @DisplayName("Valor de inyección como usuario responde 401 sin token")
    void rejectsInjectionValueAsUsername() {
        login(Map.of("username", INJECTION_VALUE, "password", "x"))
                .statusCode(401)
                .body("token", nullValue());
    }

    @Test
    @DisplayName("Valor de inyección como contraseña responde 401 sin token")
    void rejectsInjectionValueAsPassword() {
        login(Map.of("username", "student", "password", INJECTION_VALUE))
                .statusCode(401)
                .body("token", nullValue());
    }

    @Test
    @DisplayName("Valor de inyección en ambos campos responde 401 sin token")
    void rejectsInjectionValueInBothFields() {
        login(Map.of("username", INJECTION_VALUE, "password", INJECTION_VALUE))
                .statusCode(401)
                .body("token", nullValue());
    }

    @Test
    @DisplayName("Valor de inyección con comentario SQL como usuario responde 401 sin token")
    void rejectsInjectionValueWithSqlCommentAsUsername() {
        login(Map.of("username", INJECTION_VALUE + "' --", "password", "x"))
                .statusCode(401)
                .body("token", nullValue());
    }

    private static ValidatableResponse login(Map<String, String> body) {
        return given()
                .contentType("application/json")
                .body(body)
                .when().post("/auth/login")
                .then();
    }
}
