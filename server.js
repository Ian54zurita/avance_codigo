// Backend básico para login con Node.js y Express
const express = require('express');
const cors = require('cors');
const { addUser, findUser } = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ruta para agregar usuario de prueba (solo para desarrollo)
app.get('/api/add-test-user', (req, res) => {
  addUser('Juan', 'Pérez', '123456789', 'juan@mail.com', '123456', 'Calle Falsa 123', (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }
    res.json({ success: true, message: 'Usuario de prueba creado' });
  });
});

// Ruta para registrar usuarios
app.post('/api/register', (req, res) => {
  const { nombre, apellido, celular, correo, password, direccion } = req.body;
  if (!nombre || !apellido || !celular || !correo || !password || !direccion) {
    return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
  }
  addUser(nombre, apellido, celular, correo, password, direccion, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe o hay un error' });
    }
    res.json({ success: true, message: 'Usuario registrado correctamente' });
  });
});

// Ruta para login
app.post('/api/login', (req, res) => {
  const { correo, password } = req.body;
  console.log('Intento de login:', correo, password); // <-- Agrega esto
  findUser(correo, password, (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Error en el servidor' });
    if (user) {
      return res.json({ success: true, message: 'Login correcto' });
    } else {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
