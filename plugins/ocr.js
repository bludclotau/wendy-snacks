const Tesseract = require('tesseract.js');

module.exports = {
  run: async ({ action, log }) => {
    const { imageBase64 } = action;
    const buffer = Buffer.from(imageBase64, 'base64');
    const result = await Tesseract.recognize(buffer, 'eng');
    log('info', 'ocr_success');
    return { type: 'ocr_text', text: result.data.text };
  }
};