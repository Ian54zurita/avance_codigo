// database.js para MySQL
const mysql = require('mysql2');

// Cambia estos datos según tu configuración de MySQL Workbench
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // tu usuario de MySQL
  password: '', // tu contraseña de MySQL
  database: 'tienda' // nombre de la base de datos
});

// Agregar usuario
const addUser = (nombre, apellido, celular, correo, password, direccion, cb) => {
  pool.query(
    'INSERT INTO usuarios (nombre, apellido, celular, correo, password, direccion) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, apellido, celular, correo, password, direccion],
    (err, results) => {
      cb(err, results);
    }
  );
};

// Buscar usuario por correo y contraseña
const findUser = (correo, password, cb) => {
  pool.query(
    'SELECT * FROM usuarios WHERE correo = ? AND password = ?',
    [correo, password],
    (err, results) => {
      if (err) {
        console.error('Error en findUser:', err); // <-- Agrega esta línea
        return cb(err);
      }
      cb(null, results[0]);
    }
  );
};

module.exports = { addUser, findUser };
