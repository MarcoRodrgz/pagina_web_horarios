
const mongoose = require('mongoose');
const { cuarto } = require('./cuarto');

const quintoE = new mongoose.Schema(
    {
        Nombre_Profesor: { type:String},
        Materia: {type:String, require:true},
        Grupo:{ type:String, require:true},
        Turno: {type:String},
        Semestre: {type:String},
        //estos campos son opcionales
        Lunes: {type:String, default:""},
        Martes: {type:String, default:""},
        Miercoles: {type:String, default:""},
        Jueves: {type:String, default:""},
        Viernes: {type:String, default:""}
    }
)

const quinto = new mongoose.model('quinto', quintoE);
module.exports = {quinto};