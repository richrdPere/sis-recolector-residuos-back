const jwt = require("jsonwebtoken");


const generarToken = (usuario) => {
    return new Promise((resolve, reject) => {
        const payload = {
            id: usuario.id,
            username: usuario.username,
            correo: usuario.correo,
            roles: usuario.roles || []
        };
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }, (err, token) => {
            if (err) {
                reject("No se pudo generar el token");
            } else {
                // Token
                resolve(token);
            }
        });
    });


};

module.exports = {
    generarToken,
};

