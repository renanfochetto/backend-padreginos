import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3"; // Substituímos better-sqlite3 por sqlite3
import fs from "fs"; // Para verificar se o banco existe

const server = fastify({
  logger: {
    transport: {
      target: "pino-pretty",
    },
  },
});

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verificar se o arquivo do banco de dados existe
const dbPath = path.join(__dirname, "pizza.sqlite");
if (!fs.existsSync(dbPath)) {
  console.error("Erro: O arquivo 'pizza.sqlite' não foi encontrado.");
  process.exit(1);
}

// Inicializar o banco de dados
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados SQLite:", err.message);
    process.exit(1);
  } else {
    console.log("Conectado ao banco de dados SQLite.");
  }
});

// Registrar arquivos estáticos
server.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/public/",
});

// Endpoint: Obter todas as pizzas
server.get("/api/pizzas", (req, res) => {
  const pizzasQuery = `
    SELECT pizza_type_id, name, category, ingredients AS description
    FROM pizza_types
  `;
  const pizzaSizesQuery = `
    SELECT pizza_type_id AS id, size, price
    FROM pizzas
  `;

  db.all(pizzasQuery, [], (err, pizzas) => {
    if (err) {
      console.error("Erro ao buscar pizzas:", err.message);
      res.status(500).send({ error: "Erro ao buscar as pizzas." });
      return;
    }

    db.all(pizzaSizesQuery, [], (err, pizzaSizes) => {
      if (err) {
        console.error("Erro ao buscar tamanhos:", err.message);
        res.status(500).send({ error: "Erro ao buscar tamanhos." });
        return;
      }

      const responsePizzas = pizzas.map((pizza) => {
        const sizes = pizzaSizes.reduce((acc, current) => {
          if (current.id === pizza.pizza_type_id) {
            acc[current.size] = +current.price;
          }
          return acc;
        }, {});
        return {
          id: pizza.pizza_type_id,
          name: pizza.name,
          category: pizza.category,
          description: pizza.description,
          image: `/public/pizzas/${pizza.pizza_type_id}.webp`,
          sizes,
        };
      });

      res.send(responsePizzas);
    });
  });
});

// Endpoint: Pizza do dia
server.get("/api/pizza-of-the-day", (req, res) => {
  const pizzasQuery = `
    SELECT pizza_type_id AS id, name, category, ingredients AS description
    FROM pizza_types
  `;

  db.all(pizzasQuery, [], (err, pizzas) => {
    if (err) {
      console.error("Erro ao buscar pizzas:", err.message);
      res.status(500).send({ error: "Erro ao buscar a pizza do dia." });
      return;
    }

    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const pizzaIndex = daysSinceEpoch % pizzas.length;
    const pizza = pizzas[pizzaIndex];

    const sizesQuery = `
      SELECT size, price
      FROM pizzas
      WHERE pizza_type_id = ?
    `;

    db.all(sizesQuery, [pizza.id], (err, sizes) => {
      if (err) {
        console.error("Erro ao buscar tamanhos da pizza do dia:", err.message);
        res.status(500).send({ error: "Erro ao buscar tamanhos da pizza do dia." });
        return;
      }

      const sizeObj = sizes.reduce((acc, current) => {
        acc[current.size] = +current.price;
        return acc;
      }, {});

      const responsePizza = {
        id: pizza.id,
        name: pizza.name,
        category: pizza.category,
        description: pizza.description,
        image: `/public/pizzas/${pizza.id}.webp`,
        sizes: sizeObj,
      };

      res.send(responsePizza);
    });
  });
});

// Inicializar o servidor
const start = async () => {
  try {
    await server.listen({ port: PORT });
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`📂 Imagens disponíveis em http://localhost:${PORT}/public/`);
  } catch (err) {
    console.error("Erro ao iniciar o servidor:", err);
    process.exit(1);
  }
};

start();
