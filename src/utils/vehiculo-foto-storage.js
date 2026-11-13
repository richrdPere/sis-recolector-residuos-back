const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');

const AppError = require('./app-error');

const {
    uploadsRoot,
} = require('../config/uploads');

const MAX_BYTES = 5 * 1024 * 1024;

const fotoRoot = path.join(
    uploadsRoot,
    'vehiculos',
);

const TIPOS = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
};

// Solo borra archivos generados por esta implementación.
// Nunca utiliza una ruta arbitraria recibida del cliente.
const borrarGestionada = async ruta => {
    const patron =
        /^\/uploads\/vehiculos\/[a-f0-9-]{36}\.(jpg|png)$/;

    if (!patron.test(ruta || '')) {
        return;
    }

    try {
        await fs.unlink(
            path.join(
                fotoRoot,
                path.basename(ruta),
            ),
        );
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(
                '[vehiculo-foto:limpieza]',
                error.code,
            );
        }
    }
};

const procesarFoto = async file => {
    if (!file) {
        throw new AppError(
            'Selecciona una fotografía.',
            400,
            'PHOTO_REQUIRED',
        );
    }

    let metadata;

    try {
        metadata = await sharp(
            file.path,
            {
                limitInputPixels: 20_000_000,
            },
        ).metadata();
    } catch {
        throw new AppError(
            'La imagen no es válida o supera 20 megapíxeles.',
            400,
            'INVALID_IMAGE',
        );
    }

    if (
        !['jpeg', 'png'].includes(metadata.format) ||
        TIPOS[file.mimetype] !== metadata.format ||
        (metadata.pages || 1) !== 1
    ) {
        throw new AppError(
            'Solo se admiten imágenes JPG, JPEG y PNG sin animación.',
            400,
            'INVALID_IMAGE',
        );
    }

    const extension =
        metadata.format === 'jpeg'
            ? 'jpg'
            : 'png';

    const nombre =
        `${randomUUID()}.${extension}`;

    const temporal = path.join(
        path.dirname(file.path),
        nombre,
    );

    const pipeline = sharp(
        file.path,
        {
            limitInputPixels: 20_000_000,
        },
    )
        .rotate()
        .resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true,
        });

    try {
        if (extension === 'jpg') {
            await pipeline
                .jpeg({
                    quality: 85,
                })
                .toFile(temporal);
        } else {
            await pipeline
                .png({
                    compressionLevel: 9,
                })
                .toFile(temporal);
        }
    } catch {
        throw new AppError(
            'No se pudo procesar la imagen.',
            400,
            'INVALID_IMAGE',
        );
    }

    const archivo = await fs.stat(temporal);

    if (archivo.size > MAX_BYTES) {
        throw new AppError(
            'La imagen procesada supera 5 MB.',
            413,
            'PHOTO_TOO_LARGE',
        );
    }

    await fs.mkdir(
        fotoRoot,
        {
            recursive: true,
        },
    );

    // tempRoot y uploadsRoot se configuran en el mismo disco.
    await fs.rename(
        temporal,
        path.join(fotoRoot, nombre),
    );

    return `/uploads/vehiculos/${nombre}`;
};

module.exports = {
    MAX_BYTES,
    procesarFoto,
    borrarGestionada,
};