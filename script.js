const axios = require('axios');
const csv = require('csv-parser');
const { writeFileSync, readFileSync } = require('fs');
const path = require('path');

const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8wne1qGkFE0m-4QwHXPkRo_Tx4FHbsE8Fw7fMD-MCc_wKTVlKL6XkcB5-pifBW3o-wWKEOxCIIsAE/pub?gid=0&single=true&output=csv';
const templateFile = path.resolve(__dirname, 'template.html');
const outputFile = path.resolve(__dirname, 'output', 'index.html');

axios.get(csvUrl, { responseType: 'stream' })
    .then(response => {
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

        response.data
            .pipe(csv())
            .on('data', (row) => {
                htmlTable += `
          <tr>
            <td>${row.Date}</td>
            <td>${row.Event}</td>
            <td>${row.Location}</td>
          </tr>
        `;
            })
            .on('end', () => {
                htmlTable += `
          </tbody>
        </table>
        `;

                // Read the template file, replace the placeholder, and write back the content
                let templateContent = readFileSync(templateFile, 'utf8');
                let updatedContent = templateContent.replace('<!-- ICD_EVENT_TABLE_CONTENT -->', htmlTable);
                writeFileSync(outputFile, updatedContent);
                console.log(`Table content has been inserted into ${outputFile}`);
            });
    })
    .catch(error => {
        console.error('Error downloading or processing the CSV file:', error);
    });
