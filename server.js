const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const endpointsFilePath = path.join(__dirname, 'endpoints.txt');

app.use(bodyParser.json());

// Função para salvar endpoints em um arquivo
const saveEndpointsToFile = (method, endpoint, json, status) => {
    const data = `${method}: ${endpoint}: ${JSON.stringify(json)}: ${status}\n`;
    fs.appendFileSync(endpointsFilePath, data, 'utf8');
};

const createDynamicEndpoint = (method, endpoint, json, status) => {
    app[method.toLowerCase()](`/${endpoint}`, (req, res) => {
        res.status(status).json(json); 
    });

    console.log(`Endpoint '/${endpoint}' carregado com sucesso!`);
};

// Função para carregar endpoints do arquivo
const loadEndpointsFromFile = () => {
    if (fs.existsSync(endpointsFilePath)) {
        const data = fs.readFileSync(endpointsFilePath, 'utf8');
        const lines = data.split('\n');

        lines.forEach(line => {
            if (line.trim()) {
                const [method, endpoint, jsonString, statusString] = line.split(': ');
                if (endpoint && jsonString && statusString) {
                    const json = JSON.parse(jsonString);
                    const status = parseInt(statusString, 10);
                    
                    createDynamicEndpoint(method, endpoint, json, status);
                
                }
            }
        });
    }
};

loadEndpointsFromFile();

app.post('/set-endpoint', (req, res) => {
    const { method, endpoint, json, status } = req.body;

    if (typeof method === 'string' && typeof endpoint === 'string' && json && typeof status === 'number') {
    
        saveEndpointsToFile(method, endpoint, json, status);

        createDynamicEndpoint(method, endpoint, json, status);

        return res.status(201).send(`Endpoint '/${endpoint}' criado com sucesso!`);
    }

    return res.status(400).send('Endpoint, JSON e status são obrigatórios.');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
