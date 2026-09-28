// Tests de caracterización de análisis y plan: rangos, comparativas y medidas por semana.
// Datos inventados (el repo es público).
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('./entorno.js');

const prueba = (app, k) => app.get('LAB_TESTS').find(t => t.k === k);

test('labFuera: por debajo del mínimo o por encima del máximo', () => {
  const app = crearApp(), fuera = app.get('labFuera');
  const glucosa = prueba(app, 'glucosa');   // 70 – 110
  assert.equal(fuera(glucosa, 69), true);
  assert.equal(fuera(glucosa, 70), false);
  assert.equal(fuera(glucosa, 110), false);
  assert.equal(fuera(glucosa, 111), true);
  assert.equal(fuera(prueba(app, 'hdl'), 39), true);   // solo mínimo (> 40)
});

test('labComparar: mejora o empeora según el lado bueno de cada prueba', () => {
  const app = crearApp(), cmp = (k, a, b) => app.get('labComparar')(prueba(app, k), a, b).clase;
  assert.equal(cmp('hba1c', 7.5, 6.8), 'mejora');     // cuanto más bajo, mejor
  assert.equal(cmp('hba1c', 6.8, 7.5), 'peora');
  assert.equal(cmp('hdl', 35, 42), 'mejora');         // cuanto más alto, mejor
  assert.equal(cmp('hdl', 42, 42), 'igual');
  assert.equal(cmp('creatinina', 1.5, 1.0), 'mejora');   // rango: entra en el rango
  assert.equal(cmp('creatinina', 1.0, 1.1), 'igual');    // rango: sigue dentro → igual
  assert.equal(cmp('creatinina', 1.0, 1.5), 'peora');    // rango: sale del rango
  assert.equal(cmp('bilirrubina', 0.8, 1.4), 'info');    // informativa: no se juzga
});

test('labDebe y labNum: cómo se escriben rangos y números', () => {
  const app = crearApp(), debe = k => app.get('labDebe')(prueba(app, k)), num = app.get('labNum');
  assert.equal(debe('glucosa'), '70 – 110');
  assert.equal(debe('hba1c'), '≤ 6,5');
  assert.equal(debe('hdl'), '≥ 40');
  assert.equal(debe('glucosa_orina'), 'sin rango');
  assert.equal(num(7.25), '7,25');
  assert.equal(num(100), '100');
});

test('ultimaDeSemana: la última medida de esa semana, o nada si no hay', () => {
  const app = crearApp(), ultima = app.get('ultimaDeSemana');
  const pesos = [{ date: '14/9/2026', weight: 90 }, { date: '18/9/2026', weight: 89.2 }, { date: '24/9/2026', weight: 88.5 }];
  const lunes = iso => new Date(iso + 'T00:00');
  assert.equal(ultima(pesos, 'weight', lunes('2026-09-14')), 89.2);
  assert.equal(ultima(pesos, 'weight', lunes('2026-09-21')), 88.5);
  assert.equal(ultima(pesos, 'weight', lunes('2026-09-28')), null);
});

// Líneas con el formato del informe del laboratorio (tal como quedan tras juntar el texto del PDF).
// Valores INVENTADOS: el repo es público.
const INFORME = [
  'Nº de muestra/laboratorio Fecha de toma de muestra Último Resultado Fecha del informe',
  '12345678 03/02/2027 08:30 04/02/2027 10:00 Susceptible cambios',
  'Glucosa * 118 mg/dL 70 - 110',
  'Creatinina 0,88 mg/dL 0,74 - 1,30',
  'Filtrado glomerular/1,73 m^2 (estimado) 95 mL/min 60 -',
  'Colesterol 199 mg/dL 115 - 200',
  'Colesterol de HDL * 38 mg/dL 40 - 70',
  'Colesterol de LDL 128 Para resultados de triglicéridos',
  'Colesterol de LDL (calculado)',
  'Colesterol no HDL (calculado) 161 mg/dL',
  'Triglicéridos * 176 mg/dL 30 - 150',
  'Hemoglobina glicosilada (A1c) * 6,9 % - 6,5',
  'Hemoglobina glicosilada (A1c; unidades SI) * 52 mmol/mol 19 - 42',
  'Glucosa (orina; tira color) 250 mg/dL',
  'Densidad (orina; tira color) * 1035,000 1010,000 - 1030,000',
  'Proteínas (orina; tira color) Negativo mg/dL',
];

test('leerInforme: fecha de toma y cada valor en su sitio, sin confundir pruebas parecidas', () => {
  const r = crearApp().get('leerInforme')(INFORME);
  assert.equal(r.fecha, '2027-02-03');   // la primera fecha de la línea de debajo de la cabecera
  assert.deepEqual(JSON.parse(JSON.stringify(r.valores)), {
    hba1c: 6.9,            // la del %, no la de «unidades SI» (52)
    glucosa: 118,          // la de sangre, no la de orina
    trigliceridos: 176,
    hdl: 38,
    ldl: 128,              // la línea «(calculado)» sin número no cuenta
    no_hdl: 161,
    colesterol: 199,       // «Colesterol» a secas, no el de HDL ni LDL
    creatinina: 0.88,      // coma decimal
    filtrado: 95,          // el «1,73» del nombre no es el valor
    glucosa_orina: 250,
    densidad_orina: 1035,
  });
});

test('leerInforme: sin la tabla de fechas, la fecha queda vacía (la pone la persona)', () => {
  const r = crearApp().get('leerInforme')(['Glucosa * 101 mg/dL 70 - 110']);
  assert.equal(r.fecha, null);
  assert.equal(r.valores.glucosa, 101);
});

test('semanaDelPlan: la semana del plan en la que estás (1, 2…), igual para la barra y la tabla', () => {
  const app = crearApp(), semana = app.get('semanaDelPlan');
  const d = s => new Date(s);
  assert.equal(semana(d('2026-09-21T00:00'), d('2026-09-21T10:00')), 1);   // el día que empieza
  assert.equal(semana(d('2026-09-21T00:00'), d('2026-09-27T23:00')), 1);   // su domingo
  assert.equal(semana(d('2026-09-21T00:00'), d('2026-09-28T09:00')), 2);   // el lunes siguiente
  assert.equal(semana(d('2026-09-24T00:00'), d('2026-09-28T09:00')), 2);   // empezar en jueves: su semana es la 1
  // Cambio de hora de primavera (28-mar-2027): esa semana tiene una hora MENOS. Contando milisegundos
  // (fórmula vieja), el lunes 29 a las 00:30 salía todavía la semana 1. Y el de otoño, por si acaso.
  assert.equal(semana(d('2027-03-22T00:00'), d('2027-03-29T00:30')), 2);
  assert.equal(semana(d('2026-10-19T00:00'), d('2026-10-26T00:30')), 2);
});

test('labComparar: estar fuera de rango por el otro lado también empeora (hallazgos de la revisión)', () => {
  const app = crearApp(), cmp = (k, a, b) => app.get('labComparar')(prueba(app, k), a, b).clase;
  assert.equal(cmp('glucosa', 65, 55), 'peora');        // hipoglucemia que baja más: antes «mejora»
  assert.equal(cmp('glucosa', 55, 80), 'mejora');       // vuelve al rango
  assert.equal(cmp('glucosa', 100, 90), 'mejora');      // dentro del rango, más bajo es mejor (como antes)
  assert.equal(cmp('creatinina', 1.5, 2.5), 'peora');   // fuera y más lejos: antes «igual»
  assert.equal(cmp('creatinina', 0.5, 1.6), 'peora');   // de demasiado bajo a demasiado alto: antes «igual»
  assert.equal(cmp('creatinina', 2.5, 1.5), 'mejora');  // fuera pero acercándose
});

test('sugerencias: por debajo de lo normal en una prueba de «más bajo es mejor», consejo de ir al médico', () => {
  const app = crearApp(), consejo = app.get('consejoPara');
  assert.match(consejo(prueba(app, 'glucosa'), 55), /médico/);
  assert.doesNotMatch(consejo(prueba(app, 'glucosa'), 150), /por debajo/);
});

test('leerInforme: laboratorios con punto decimal, con «>» delante y densidad escrita 1.035', () => {
  const r = crearApp().get('leerInforme')([
    'Creatinina 0.88 mg/dL 0.74 - 1.30',
    'Filtrado glomerular/1,73 m^2 (estimado) >90 mL/min',
    'Densidad (orina; tira color) 1.035',
  ]);
  assert.equal(r.valores.creatinina, 0.88);
  assert.equal(r.valores.filtrado, 90);
  assert.equal(r.valores.densidad_orina, 1035);
});
