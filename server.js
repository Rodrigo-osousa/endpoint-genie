const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const endpointsFilePath = path.join(__dirname, 'endpoints.txt');

// Variável para controlar o ID sequencial
let currentId = 1;

app.use(bodyParser.json());

// Função para salvar endpoints em um arquivo, incluindo o ID sequencial
const saveEndpointsToFile = (endpoints) => {
    fs.writeFileSync(endpointsFilePath, '', 'utf8'); // Limpar o arquivo antes de reescrever
    endpoints.forEach(endpoint => {
        const data = `${endpoint.id}: ${endpoint.method}: ${endpoint.endpoint}: ${JSON.stringify(endpoint.json)}: ${endpoint.status}\n`;
        fs.appendFileSync(endpointsFilePath, data, 'utf8');
    });
};

// Função para criar um endpoint dinâmico
const createDynamicEndpoint = (id, method, endpoint, json, status) => {
    app[method.toLowerCase()](`/${endpoint}`, (req, res) => {
        res.status(status).json(json);
    });

    console.log(`Endpoint '/${endpoint}' com ID ${id} carregado com sucesso!`);
};

// Função para carregar endpoints do arquivo, incluindo o ID
const loadEndpointsFromFile = () => {
    const endpoints = [];
    if (fs.existsSync(endpointsFilePath)) {
        const data = fs.readFileSync(endpointsFilePath, 'utf8');
        const lines = data.split('\n');

        lines.forEach(line => {
            if (line.trim()) {
                const [idString, method, endpoint, jsonString, statusString] = line.split(': ');
                if (idString && method && endpoint && jsonString && statusString) {
                    const id = parseInt(idString, 10);
                    const json = JSON.parse(jsonString);
                    const status = parseInt(statusString, 10);
                    
                    // Atualizar o ID atual se o ID carregado for maior
                    currentId = Math.max(currentId, id + 1);

                    // Armazenar o endpoint para criar na execução
                    endpoints.push({ id, method, endpoint, json, status });
                    createDynamicEndpoint(id, method, endpoint, json, status);
                }
            }
        });
    }
    return endpoints;
};

// Carregar endpoints ao iniciar o servidor
const loadedEndpoints = loadEndpointsFromFile();

// Rota para criar um novo endpoint
app.post('/set-endpoint', (req, res) => {
    const { method, endpoint, json, status } = req.body;

    if (typeof method === 'string' && typeof endpoint === 'string' && json && typeof status === 'number') {
        const id = currentId++;

        // Adicionar o novo endpoint no arquivo
        const newEndpoint = { id, method, endpoint, json, status };
        loadedEndpoints.push(newEndpoint);
        
        // Salvar no arquivo
        saveEndpointsToFile(loadedEndpoints);

        // Criar o endpoint na execução
        createDynamicEndpoint(id, method, endpoint, json, status);

        return res.status(201).send(`Endpoint '/${endpoint}' com ID ${id} criado com sucesso!`);
    }

    return res.status(400).send('Endpoint, JSON e status são obrigatórios.');
});

// Rota para buscar um endpoint pelo ID
app.get('/get-endpoint/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const endpoint = loadedEndpoints.find(ep => ep.id === id);

    if (endpoint) {
        return res.json(endpoint);
    }

    return res.status(404).send('Endpoint não encontrado.');
});

// Rota para atualizar um endpoint
app.put('/update-endpoint/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { method, endpoint, json, status } = req.body;

    const existingEndpointIndex = loadedEndpoints.findIndex(ep => ep.id === id);
    if (existingEndpointIndex === -1) {
        return res.status(404).send('Endpoint não encontrado.');
    }

    if (typeof method === 'string' && typeof endpoint === 'string' && json && typeof status === 'number') {
        // Atualizar o endpoint no arquivo
        loadedEndpoints[existingEndpointIndex] = { id, method, endpoint, json, status };

        // Salvar no arquivo novamente
        saveEndpointsToFile(loadedEndpoints);

        // Remover o endpoint antigo da execução
        app._router.stack = app._router.stack.filter(route => {
            return !(route.route && route.route.path === `/${endpoint}`);
        });

        // Criar o novo endpoint
        createDynamicEndpoint(id, method, endpoint, json, status);

        return res.status(200).send(`Endpoint '/${endpoint}' com ID ${id} atualizado com sucesso!`);
    }

    return res.status(400).send('Método, endpoint, JSON e status são obrigatórios para atualização.');
});

// Rota para excluir um endpoint pelo ID (somente da execução)
app.delete('/delete-endpoint/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);

    const existingEndpointIndex = loadedEndpoints.findIndex(ep => ep.id === id);
    if (existingEndpointIndex === -1) {
        return res.status(404).send('Endpoint não encontrado.');
    }

    const { method, endpoint } = loadedEndpoints[existingEndpointIndex];

    // Remover da execução
    loadedEndpoints.splice(existingEndpointIndex, 1);

    // Remover o endpoint da execução
    app._router.stack = app._router.stack.filter(route => {
        return !(route.route && route.route.path === `/${endpoint}`);
    });

    return res.status(200).send(`Endpoint '/${endpoint}' com ID ${id} removido da execução com sucesso!`);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
