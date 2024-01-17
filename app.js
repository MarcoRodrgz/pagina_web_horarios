const mongoose = require('mongoose');
const { segundo } = require('./modeloHorario');
const { tercero } = require('./tercero');
const { cuarto } = require('./cuarto');
const { quinto } = require('./quinto');

const bodyParser = require('body-parser');
const express = require('express');
const port = 3000;

const app = express();

const URI = 'mongodb://mongo:Bee-C1CggFb4eA5CGebd6c5gfHghA3cH@roundhouse.proxy.rlwy.net:33324';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});



// Ruta para consultar horarios y generarlos automáticamente
app.post('/consultar', async (req, res) => {
    const { materiasHidden } = req.body;
    const materias = materiasHidden.split(',').map(materia => materia.trim());

    try {
        // Objeto para almacenar los horarios generados
        const horariosGenerados = {};

        // Iterar sobre cada materia
        for (const materia of materias) {
            try {
                // Realizar la consulta a la colección "tercero" para cada materia
                const resultadoTercero = await tercero.find({ Materia: materia });

                if (resultadoTercero.length > 0) {
                    // Seleccionar aleatoriamente un profesor de la materia
                    const infoMateria = resultadoTercero[Math.floor(Math.random() * resultadoTercero.length)];
                    // Generar un horario aleatorio para la materia
                    const horarioAleatorio = await generarHorarioAleatorio(infoMateria);

                    // Almacenar el horario generado en el objeto
                    horariosGenerados[materia] = horarioAleatorio;
                } else {
                    // Si no hay profesores en "tercero", intentar en otras colecciones según el semestre
                    const resultadoSegundo = await segundo.find({ Materia: materia });
                    const resultadoCuarto = await cuarto.find({ Materia: materia });
                    const resultadoQuinto = await quinto.find({ Materia: materia });

                    // Realizar consultas adicionales según sea necesario para otras colecciones
                    if (resultadoSegundo.length > 0) {
                        const infoMateria = resultadoSegundo[Math.floor(Math.random() * resultadoSegundo.length)];
                        const horarioAleatorio = await generarHorarioAleatorio(infoMateria);
                        horariosGenerados[materia] = horarioAleatorio;
                    } else if (resultadoCuarto.length > 0) {
                        const infoMateria = resultadoCuarto[Math.floor(Math.random() * resultadoCuarto.length)];
                        const horarioAleatorio = await generarHorarioAleatorio(infoMateria);
                        horariosGenerados[materia] = horarioAleatorio;
                    } else if (resultadoQuinto.length > 0) {
                        const infoMateria = resultadoQuinto[Math.floor(Math.random() * resultadoQuinto.length)];
                        const horarioAleatorio = await generarHorarioAleatorio(infoMateria);
                        horariosGenerados[materia] = horarioAleatorio;
                    } else {
                        // Manejar el caso en que no se encuentren profesores en ninguna colección
                        horariosGenerados[materia] = { error: 'No se encontraron profesores para esta materia en ninguna colección' };
                    }
                }
            } catch (error) {
                console.error(`Error en la consulta para la materia ${materia}: ${error.message}`);
                horariosGenerados[materia] = { error: 'Error en la consulta de profesores para esta materia' };
            }
        }

        // Enviar la respuesta en formato HTML
        const htmlResult = generateHTMLTable(horariosGenerados);

        res.send(htmlResult);
    } catch (error) {
        res.status(500).send(`Error en la consulta: ${error.message}`);
    }
});

function noTraslape(horarioDias, nuevaClase) {
    if (!horarioDias[nuevaClase.Dia]) {
        return true;  // Si no hay clases para ese día, no hay traslape
    }

    const nuevaHora = obtenerValorHora(nuevaClase.Hora);

    for (const clase of horarioDias[nuevaClase.Dia]) {
        const horaExistente = obtenerValorHora(clase.Hora);

        // Verificar si hay traslape
        if (Math.abs(horaExistente - nuevaHora) <= 1) {
            return false;
        }
    }

    return true;  // No hay traslape
}

// Modificar la función para obtener horas y profesores
async function obtenerHorasProfesor(infoMateria) {
    const horarioProfesor = [];

    // Iterar sobre los días de la semana
    const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

    for (const dia of diasSemana) {
        if (dia in infoMateria) {
            const horas = infoMateria[dia];
            const profesores = infoMateria['Nombre_Profesor'];  // Asegurarse de que el nombre de la propiedad sea correcto
            //console.log('+++++++++++++++++++Los profesores agregados son: ',prof);

            // Verificar que la propiedad horas sea una cadena antes de dividirla
            if (typeof horas === 'string') {
                // Agregar las horas y el nombre del profesor al array
                horas.split(',').forEach(hora => {
                    const horaTrimmed = hora.trim();
                    if (horaTrimmed !== '') {
                        // Agregar solo si la hora no está vacía
                        horarioProfesor.push({
                            Materia: infoMateria.Materia,
                            Profesor: profesores,  // Usar el nombre correcto de la propiedad
                            Dia: dia,
                            Hora: horaTrimmed,
                        });
                    }
                });
            }
        }
    }

    return horarioProfesor;
}

function obtenerValorHora(hora) {
    const horasDelDia = {
        "7:00 - 8:30": 0,
        "8:30 - 10:00": 1,
        "10:30 - 12:00": 2,
        "12:00 - 13:30": 3,
        "13:30 - 15:00": 4
    };

    // Si la hora está en el objeto, devolver el valor correspondiente; de lo contrario, devolver -1
    return horasDelDia[hora] !== undefined ? horasDelDia[hora] : -1;
}
// Modificar la función para generar un horario aleatorio
async function generarHorarioAleatorio(infoMateria) {
    const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

    // Obtener las horas y el nombre del profesor de la base de datos
    const horasProfesor = await obtenerHorasProfesor(infoMateria);

    // Objeto para almacenar el horario aleatorio
    const horarioAleatorio = {
        Materia: infoMateria.Materia,
        Profesores: [],  // Se actualizará con los nombres de los profesores
        Dias: {},
        Grupo: infoMateria.Grupo
    };

    // Conjunto para rastrear las horas ya seleccionadas para cada día
    const horasSeleccionadasPorDia = {};

    // Iterar sobre cada día de la semana
    for (const dia of diasSemana) {
        if (dia in infoMateria && infoMateria[dia]) {
            // Filtrar las horas y el nombre del profesor para el día actual
            const horasProfesorDia = horasProfesor.filter(entry => entry.Dia === dia);

            // Verificar si hay datos para el día actual
            if (horasProfesorDia.length > 0) {
                // Filtrar las horas que aún no se han seleccionado para el día actual
                const horasDisponibles = horasProfesorDia.filter(entry => !horasSeleccionadasPorDia[dia] || !horasSeleccionadasPorDia[dia].has(entry.Hora));

                // Verificar si aún hay horas disponibles
                if (horasDisponibles.length > 0) {
                    // Elegir aleatoriamente una entrada de profesor para el día actual
                    const profesorAleatorio = horasDisponibles[Math.floor(Math.random() * horasDisponibles.length)];

                    // Verificar si la hora ya está ocupada en el horarioAleatorio
                    if (!horasSeleccionadasPorDia[dia]) {
                        horasSeleccionadasPorDia[dia] = new Set();
                    }

                    // Intentar asignar la clase hasta que no haya traslape
                    let intentos = 0;
                    const maxIntentos = 5;  // Establecer un límite para evitar bucles infinitos

                    while (intentos < maxIntentos && !noTraslape(horarioAleatorio.Dias, profesorAleatorio)) {
                        profesorAleatorio = horasDisponibles[Math.floor(Math.random() * horasDisponibles.length)];
                        intentos++;
                    }

                    if (intentos < maxIntentos) {
                        // Agregar los datos al horario aleatorio
                        horarioAleatorio.Profesores.push(profesorAleatorio.Profesor);

                        if (!horarioAleatorio.Dias[dia]) {
                            horarioAleatorio.Dias[dia] = [];
                        }
                        horarioAleatorio.Dias[dia].push({ Hora: profesorAleatorio.Hora });

                        // Registrar la hora seleccionada para evitar repeticiones
                        horasSeleccionadasPorDia[dia].add(profesorAleatorio.Hora);
                    } else {
                        // Si no se puede evitar traslape después de varios intentos, agregar "Sin clase"
                        if (!horarioAleatorio.Dias[dia]) {
                            horarioAleatorio.Dias[dia] = [];
                        }
                        horarioAleatorio.Dias[dia].push({ Hora: 'Sin clase' });
                    }
                } else {
                    // Si no hay horas disponibles, agregar "Sin clase"
                    if (!horarioAleatorio.Dias[dia]) {
                        horarioAleatorio.Dias[dia] = [];
                    }
                    horarioAleatorio.Dias[dia].push({ Hora: 'Sin clase' });
                }
            } else {
                // Si no hay clase para el día actual, agregar "Sin clase"
                if (!horarioAleatorio.Dias[dia]) {
                    horarioAleatorio.Dias[dia] = [];
                }
                horarioAleatorio.Dias[dia].push({ Hora: 'Sin clase' });
            }
        } else {
            // Si no hay datos para el día actual, agregar "Sin clase"
            if (!horarioAleatorio.Dias[dia]) {
                horarioAleatorio.Dias[dia] = [];
            }
            horarioAleatorio.Dias[dia].push({ Hora: 'Sin clase' });
        }
    }

    return horarioAleatorio;
}

// Función para generar la tabla HTML con los resultados de los horarios
function generateHTMLTable(horariosGenerados) {
    let htmlResult = '<html ><head><script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous"><title>Resultados de Horarios Generados</title></head><body>';
    
    // Aplicar estilos a la tabla
    htmlResult += '<style>';
    htmlResult += '  .table-bordered { border: 1px solid #dee2e6; }';
    htmlResult += '  .table thead th { background-color: #259CFF; color: #fff; }';
    htmlResult += '  .table-striped tbody tr:nth-of-type(odd) { background-color: rgba(0, 123, 255, 0.1); }';
    htmlResult += '  .table-hover tbody tr:hover { background-color: rgba(0, 123, 255, 0.2); }';
    htmlResult += '  #contenedor-tabla {';
    htmlResult += '    height: 400px;';
    //htmlResult += ' background-color: #ffffff';
    htmlResult += '    overflow: auto;';
    htmlResult += '    margin: 0 auto;';  // Centrar horizontalmente
    htmlResult += '    max-width: 80%;';  // Ajustar el ancho según sea necesario
    htmlResult += '    padding: 20px;';  // Añadir espacio de relleno
    htmlResult += '  }';
    htmlResult += '  #tabla-horarios {';
    htmlResult += ' background-color: #ffffff';
    htmlResult += '  }';
    htmlResult += '  body {';
    htmlResult += '    background-color: #F4E9FF;';  // Cambia #f0f0f0 por el color que desees
    htmlResult += '  }';
    htmlResult += '</style>';

    htmlResult += '<div id="contenedor-tabla" style="height: 400px; overflow: auto;">';
    htmlResult += '<table id="tabla-horarios" class="table table-bordered table-striped" ><thead><tr><th>Materia</th><th>Grupo</th><th>Profesores</th><th>Lunes</th><th>Martes</th><th>Miércoles</th><th>Jueves</th><th>Viernes</th><th>Accion</th></tr></thead><tbody>';
    


    // Ordenar las materias alfabéticamente
    const materiasOrdenadas = Object.keys(horariosGenerados).sort();

    for (const materia of materiasOrdenadas) {
        const horario = horariosGenerados[materia];
        console.log(`Procesando materia: ${materia}, Grupo: ${horario.Grupo}, Profesores: ${horario.Profesores[0]}`);
        
        const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
        console.log(`Días de la semana: ${diasSemana.join(', ')}`);

        let row = `<tr><td>${horario.Materia}</td><td>${horario.Grupo}</td><td>${horario.Profesores[0]}</td>`;

        for (const dia of diasSemana) {
            console.log(`Procesando día ${dia}`);
            row += `<td>${horario.Dias[dia] ? horario.Dias[dia].map(hora => hora.Hora).join(', ') : ''}</td>`;
        }

        // Agregar botón para eliminar fila
        row += '<td><button class="btn btn-outline-danger" onclick="eliminarFila(this)">Eliminar</button></td>';

        row += '</tr>';
        htmlResult += row;

    }
    htmlResult += '</tbody></table>';
    htmlResult += '</div>';

    // Contenedor para los botones centrados
    htmlResult += '<div class="d-flex justify-content-center" style="margin-top: 10px; background-color: #F4E9FF;">';
    
    // Botón "Generar nuevo horario"
    htmlResult += '  <form action="/consultar" method="post" style="margin-right: 30px;">';
    htmlResult += '    <input type="hidden" name="materiasHidden" value="' + Object.keys(horariosGenerados).join(',') + '">';
    htmlResult += '    <button class="btn btn-success" type="submit">Generar nuevo horario</button>';
    htmlResult += '  </form>';

    // Botón "Volver al Formulario"
    htmlResult += ' <br> <br> <form action="/" method="get" style="margin-right: 30px;">';
    htmlResult += '    <button class="btn btn-primary" type="submit style="background-color: #4CAF50">Volver al Formulario</button>';
    htmlResult += '  </form>';
    htmlResult += '<br> <br><button class="btn btn-primary" onclick="guardarComoImagen()">Guardar horario</button>';

    htmlResult += '</div>';

    htmlResult += '<script>';
    htmlResult += 'function guardarComoImagen() {';
    htmlResult += '  html2canvas(document.getElementById("contenedor-tabla")).then(canvas => {';
    htmlResult += '    var img = canvas.toDataURL("image/png");';
    htmlResult += '    var link = document.createElement("a");';
    htmlResult += '    link.href = img;';
    htmlResult += '    link.download = "tabla_horarios.png";'; // Cambia la extensión según tu preferencia
    htmlResult += '    link.click();';
    htmlResult += '  });';
    htmlResult += '}';
    htmlResult += '</script>';

    htmlResult += '<br>';
    htmlResult += '<br>';

    htmlResult += ' <h5  style="text-align: center;">Danos tu opinión,¡solo te tomara un minuto!</h5>';
    htmlResult += '<br>';
    htmlResult += '<div style="display: flex; justify-content: center; align-items: center; height: 600px; background-color: #F4E9FF;">';
    htmlResult += '  <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdGEC_ATsQhO62V-noy6efrBQVR7G6r4ZoWyKZhN7Bc2Goxtg/viewform" width="80%" height="100%" frameborder="0"></iframe>';
    htmlResult += '</div>';
    //   <h5>h5. Bootstrap heading</h5>
    htmlResult += '<script>';
    htmlResult += 'function eliminarFila(button) {';
    htmlResult += '  var row = button.parentNode.parentNode;';
    htmlResult += '  row.parentNode.removeChild(row);';
    htmlResult += '}';
    htmlResult += '</script>';
    htmlResult += '</body></html>';
    
    return htmlResult;
}
mongoose.connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('CONEXION EXITOSA');
    })
    .catch((err) => {
        console.log(`ERROR DE CONEXION ${err}`);
    });

app.listen(port, () => {
    console.log(`El servidor está escuchando en http://localhost:${port}`);
});