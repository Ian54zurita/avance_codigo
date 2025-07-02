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

// Crear tabla de pagos si no existe (MySQL)
pool.query(`
  CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_correo VARCHAR(255),
    usuario_nombre VARCHAR(255),
    usuario_apellido VARCHAR(255),
    plan VARCHAR(255),
    monto VARCHAR(255),
    fecha VARCHAR(255),
    facturaBase64 LONGTEXT
  )
`);

// Agregar pago
const addPago = (usuario_correo, usuario_nombre, usuario_apellido, plan, monto, fecha, facturaBase64, callback) => {
  pool.query(
    `INSERT INTO pagos (usuario_correo, usuario_nombre, usuario_apellido, plan, monto, fecha, facturaBase64) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [usuario_correo, usuario_nombre, usuario_apellido, plan, monto, fecha, facturaBase64],
    callback
  );
};

// Editar usuario (nombre, apellido, celular, direccion)
const updateUser = (correo, nombre, apellido, celular, direccion, cb) => {
  pool.query(
    'UPDATE usuarios SET nombre = ?, apellido = ?, celular = ?, direccion = ? WHERE correo = ?',
    [nombre, apellido, celular, direccion, correo],
    (err, results) => {
      cb(err, results);
    }
  );
};

// Cambiar contraseña
const changePassword = (correo, oldPassword, newPassword, cb) => {
  pool.query(
    'SELECT * FROM usuarios WHERE correo = ? AND password = ?',
    [correo, oldPassword],
    (err, results) => {
      if (err) return cb(err);
      if (!results.length) return cb(new Error('Contraseña actual incorrecta'));
      pool.query(
        'UPDATE usuarios SET password = ? WHERE correo = ?',
        [newPassword, correo],
        (err2, results2) => {
          cb(err2, results2);
        }
      );
    }
  );
};

module.exports = { addUser, findUser, addPago, updateUser, changePassword };
