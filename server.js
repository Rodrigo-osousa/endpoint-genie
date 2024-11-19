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

// Função para criar um endpoint dinâmico
const createDynamicEndpoint = (method, endpoint, json, status) => {
    app[method.toLowerCase()](`/${endpoint}`, (req, res) => {
        try {
            // Verifique se json é uma lista, e caso seja, retorna a lista. Se não, retorna o próprio objeto.
            if (Array.isArray(json)) {
                res.status(status).json(json); // Retorna a lista se for um array
            } else {
                res.status(status).json(json); // Retorna o objeto se for um único objeto
            }
        } catch (error) {
            res.status(500).json({ message: "Erro ao processar o JSON", error: error.message });
        }
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

                // Verifique se a linha tem os 4 elementos necessários
                if (method && endpoint && jsonString && statusString) {
                    try {
                        // Tente fazer o parse do JSON
                        const json = JSON.parse(jsonString); // Aqui, fazemos o JSON.parse()
                        const status = parseInt(statusString, 10);

                        // Verifique se o status é um número válido
                        if (isNaN(status)) {
                            throw new Error("Status inválido");
                        }

                        createDynamicEndpoint(method, endpoint, json, status);

                    } catch (error) {
                        console.error(`Erro ao processar linha: ${line}`);
                        console.error(`Detalhes do erro: ${error.message}`);
                    }
                } else {
                    console.error(`Linha malformada: ${line}`);
                }
            }
        });
    }
};

loadEndpointsFromFile();

// Rota para configurar novos endpoints
app.post('/set-endpoint', (req, res) => {
    const { method, endpoint, json, status } = req.body;

    // Validação para garantir que 'json' seja um objeto ou uma lista
    if (typeof method === 'string' && typeof endpoint === 'string' && (Array.isArray(json) || typeof json === 'object') && typeof status === 'number') {
        // Verificar se o JSON não está vazio ou malformado
        try {
            // Salvando e criando o endpoint
            saveEndpointsToFile(method, endpoint, json, status);
            createDynamicEndpoint(method, endpoint, json, status);
            return res.status(201).send(`Endpoint '/${endpoint}' criado com sucesso!`);
        } catch (error) {
            return res.status(500).send(`Erro ao processar a requisição: ${error.message}`);
        }
    }

    return res.status(400).send('Endpoint, json (objeto ou lista) e status são obrigatórios.');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
