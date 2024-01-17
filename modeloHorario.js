const mongoose = require('mongoose');

const horariosE = new mongoose.Schema(
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

const segundo = new mongoose.model('segundo', horariosE);

module.exports = {segundo};
