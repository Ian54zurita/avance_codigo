// Backend básico para login con Node.js y Express
const express = require('express');
const app = express();
const PORT = 3000;
const cors = require('cors');
const { addUser, findUser, addPago, updateUser, changePassword } = require('./database');
const nodemailer = require('nodemailer');
const fs = require('fs');

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Ruta para editar perfil (nombre, apellido, celular, direccion)
app.post('/api/editar-perfil', (req, res) => {
  const { correo, nombre, apellido, celular, direccion } = req.body;
  if (!correo || !nombre || !apellido || !celular || !direccion) {
    return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
  }
  updateUser(correo, nombre, apellido, celular, direccion, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error al actualizar perfil', error: err.message });
    res.json({ success: true, message: 'Perfil actualizado correctamente' });
  });
});

// Ruta para cambiar contraseña
app.post('/api/cambiar-password', (req, res) => {
  const { correo, oldPassword, newPassword } = req.body;
  if (!correo || !oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
  }
  changePassword(correo, oldPassword, newPassword, (err, results) => {
    if (err) {
      if (err.message === 'Contraseña actual incorrecta') {
        return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
      }
      return res.status(500).json({ success: false, message: 'Error al cambiar contraseña', error: err.message });
    }
    res.json({ success: true, message: 'Contraseña cambiada correctamente' });
  });
});


// Ruta raíz para evitar el mensaje "No se puede obtener /"
app.get('/', (req, res) => {
  res.send('Backend de Laboratorios R&D activo.');
});

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
      // Devuelve todos los datos del usuario para el frontend
      return res.json({ success: true, message: 'Login correcto', user });
    } else {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos' });
    }
  });
});

app.post('/api/pago', async (req, res) => {
  const { usuario_correo, usuario_nombre, usuario_apellido, plan, monto, fecha, facturaBase64 } = req.body;
  console.log('--- NUEVO PAGO RECIBIDO ---');
  console.log('Body recibido:', req.body);
  if (!usuario_correo || !plan || !monto || !fecha || !facturaBase64) {
    console.log('Datos incompletos:', req.body);
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }
  addPago(usuario_correo, usuario_nombre, usuario_apellido, plan, monto, fecha, facturaBase64, (err, results) => {
    if (err) {
      console.error('Error al guardar pago:', err.sqlMessage || err.message || err);
      return res.status(500).json({ success: false, message: 'Error al guardar pago', error: err.sqlMessage || err.message || err });
    }
    console.log('Pago guardado en la base de datos. Result:', results);
    // Guardar factura temporalmente
    try {
      const facturaPath = `factura_${Date.now()}.pdf`;
      fs.writeFileSync(facturaPath, Buffer.from(facturaBase64, 'base64'));
      console.log('Factura PDF generada en:', facturaPath);
      // Enviar email con factura
      enviarFacturaPorEmail(usuario_correo, usuario_nombre, plan, monto, fecha, facturaPath, (emailErr) => {
        fs.unlinkSync(facturaPath); // Borra el archivo temporal
        if (emailErr) {
          console.error('Error al enviar email:', emailErr);
          return res.status(500).json({ success: false, message: 'Pago guardado, pero error al enviar email', error: emailErr.message || emailErr });
        }
        console.log('Factura enviada correctamente a', usuario_correo);
        res.json({ success: true, message: 'Pago registrado y factura enviada' });
      });
    } catch (e) {
      console.error('Error al generar o enviar la factura:', e);
      return res.status(500).json({ success: false, message: 'Pago guardado, pero error al generar o enviar la factura', error: e.message || e });
    }
  });
});

// Ruta para obtener pagos de un usuario (para historial en perfil)
app.get('/api/pagos', (req, res) => {
  const correo = req.query.correo;
  if (!correo) return res.json({ success: false, pagos: [] });
  // Trae los pagos y la factura en base64
  const mysql = require('mysql2');
  const pool = require('./database').pool || require('mysql2').createPool({
    host: 'localhost', user: 'root', password: '', database: 'tienda'
  });
  pool.query('SELECT * FROM pagos WHERE usuario_correo = ?', [correo], (err, results) => {
    if (err) return res.json({ success: false, pagos: [] });
    // Leer cada factura y devolverla en base64 (si existe el archivo)
    const pagos = results.map(p => {
      let facturaBase64 = '';
      try {
        // Busca la factura en disco (opcional: si guardas el archivo)
        // facturaBase64 = fs.readFileSync(p.factura_path, {encoding:'base64'});
      } catch(e){}
      return { ...p, facturaBase64 };
    });
    res.json({ success: true, pagos });
  });
});

function enviarFacturaPorEmail(destino, nombre, plan, monto, fecha, facturaPath, callback) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ianeitor54@gmail.com',
      pass: 'iuuprucyfejwprxf' // contraseña de aplicación generada
    }
  });
  let mailOptions = {
    from: '"Laboratorios R&D" <ianeitor54@gmail.com>',
    to: destino,
    subject: 'Factura de tu compra',
    text: `Hola ${nombre}, adjuntamos la factura de tu compra del plan ${plan} por ${monto} el ${fecha}.`,
    attachments: [{ filename: 'factura.pdf', path: facturaPath }]
  };
  transporter.sendMail(mailOptions, callback);
}

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
