const axios = require('axios');
const csv = require('csv-parser');
const minify = require('html-minifier').minify;
const { writeFileSync, readFileSync } = require('fs');
const path = require('path');

const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8wne1qGkFE0m-4QwHXPkRo_Tx4FHbsE8Fw7fMD-MCc_wKTVlKL6XkcB5-pifBW3o-wWKEOxCIIsAE/pub?gid=0&single=true&output=csv';
const templateFile = path.resolve(__dirname, 'template.html');
const templateFileEn = path.resolve(__dirname, 'template-en.html');
const outputFile = path.resolve(__dirname, 'output', 'index.html');
const outputFileEn = path.resolve(__dirname, 'output', 'en.html');

(async () => {
    try {
        const response = await axios.get(csvUrl, { responseType: 'stream' });
        generateHTML(response.data, templateFile, outputFile);
        generateHTML(response.data, templateFileEn, outputFileEn);
    } catch (error) {
        console.error('Error downloading or processing the CSV file:', error);
    }
})();

function generateHTML(data, templateFile, outputFile) {
    let htmlTable = `
    <table class="table agenda">
      <thead>
        <tr>
          <th scope="col">Datum</th>
          <th scope="col">Event</th>
          <th scope="col">Locatie</th>
        </tr>
      </thead>
      <tbody>
  `;

    data
        .pipe(csv())
        .on('data', (row) => {
            // Filter out rows with any empty values
            if (row.Date && row.Event && row.Location) {
                htmlTable += `
        <tr>
          <td>${row.Date}</td>
          <td>${row.Event}</td>
          <td>${row.Location}</td>
        </tr>
        `;
            }
        })
        .on('end', () => {
            htmlTable += `
        </tbody>
      </table>
      `;

            // Read the template file, replace the placeholder, and write back the content
            let templateContent = readFileSync(templateFile, 'utf8');
            let updatedContent = minify(templateContent.replace('<!-- ICD_EVENT_TABLE_CONTENT -->', htmlTable), {
                collapseWhitespace: true,
                conservativeCollapse: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true,
            });
            writeFileSync(outputFile, updatedContent);
            console.log(`Table content has been inserted into ${outputFile}`);
        });
}
