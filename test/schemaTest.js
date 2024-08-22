import Schema from '../build/Schema/Schema.js';
// Función de prueba para la clase Schema
function testSchema() {
    // Definición de un esquema de ejemplo
    const schema = new Schema({
        str: { type: 'string', required: true, minLength: 5, maxLength: 10, pattern: /^[a-zA-Z]+$/ },
        num: { type: 'number', required: true, minimum: 10, maximum: 100 },
        bool: { type: 'boolean', default: true },
        arr: { type: 'array', property: {
            type: 'number', minimum: 1, maximum: 10
        }, minimum: 2, X: "", maximum: 5 },
        obj: { type: 'object', schema: {
            subStr: { type: 'string', nullable: true },
            subNum: { type: 'number', default: 42, },
        }},
        a: {
            type: 'array',
            property: { type: 'number' },
        }
    });
    console.log("Esquema inferido:", schema.infer);
    try {
        // Prueba 1: Valores correctos
        const validDoc = {
            str: "Hello",
            num: 50,
            arr: [2, 3],
            obj: {
                subStr: "world"
            }
        };
        const generatedData1 = schema.processData(validDoc);
        console.log("Prueba 1 - Datos generados (válidos):", generatedData1);
    } catch (error) {
        console.error("Prueba 1 - Error:", error.message);
    }

    try {
        // Prueba 2: Falta un campo requerido (str)
        const invalidDoc1 = {
            num: 50,
            arr: [2, 3],
            obj: {
                subStr: "world"
            }
        };
        const generatedData2 = schema.processData(invalidDoc1);
        console.log("Prueba 2 - Datos generados (falta str):", generatedData2);
    } catch (error) {
        console.error("Prueba 2 - Error:", error.message);
    }

    try {
        // Prueba 3: El campo string no cumple con el patrón
        const invalidDoc2 = {
            str: "H3llo",
            num: 50,
            arr: [2, 3],
            obj: {
                subStr: "world"
            }
        };
        const generatedData3 = schema.processData(invalidDoc2);
        console.log("Prueba 3 - Datos generados (str no cumple con el patrón):", generatedData3);
    } catch (error) {
        console.error("Prueba 3 - Error:", error.message);
    }

    try {
        // Prueba 4: El campo array tiene demasiados elementos
        const invalidDoc3 = {
            str: "Hello",
            num: 50,
            arr: [2, 3, 4, 5, 6, 7],
            obj: {
                subStr: "world"
            }
        };
        const generatedData4 = schema.processData(invalidDoc3);
        console.log("Prueba 4 - Datos generados (array demasiado grande):", generatedData4);
    } catch (error) {
        console.error("Prueba 4 - Error:", error.message);
    }

    try {
        // Prueba 5: Generación con valores por defecto y nullables
        const partialDoc = {
            str: "TestString",
            num: 90,
            obj: {
                subStr: null
            }
        };
        const generatedData5 = schema.processData(partialDoc);
        console.log("Prueba 5 - Datos generados (valores por defecto y nullables):", generatedData5);
    } catch (error) {
        console.error("Prueba 5 - Error:", error.message);
    }
}

// Ejecutar las pruebas
testSchema();