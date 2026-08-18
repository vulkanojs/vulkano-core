/**
 * Locale — Español (defaults del core)
 *
 * Sobreescrito por las mismas claves en app/config/locales/es.js del proyecto
 *
 */

module.exports = {

  upload: {
    notUploaded: 'No se pudo subir el archivo',
    noPermission: 'La carpeta no tiene permisos para guardar el archivo',
    invalidMimeType: 'El tipo MIME del archivo seleccionado no está permitido: {{mimetype}}',
    extensionNotAllowed: 'La extensión del archivo no está permitida: {{ext}}',
    maxSizeExceeded: 'El archivo excede el tamaño máximo permitido de {{size}}MB'
  }

};
