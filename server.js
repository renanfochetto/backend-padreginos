import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import Database from 'better-sqlite3';  // Mudança aqui!

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

// A mudança está aqui
const db = new Database('./pizza.sqlite', { verbose: console.log }); // Mudança para usar o better-sqlite3

server.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/public/",
});

// Resto do código permanece igual, já que as APIs de consulta são similares
server.get("/api/pizzas", async function getPizzas(req, res) {
  const pizzas = db.prepare(
    "SELECT pizza_type_id, name, category, ingredients as description FROM pizza_types"
  ).all();
  const pizzaSizes = db.prepare(
    `SELECT pizza_type_id as id, size, price FROM pizzas`
  ).all();

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

// O restante dos endpoints continuam com a mesma estrutura
server.get("/api/pizza-of-the-day", async function getPizzaOfTheDay(req, res) {
  const pizzas = db.prepare(
    `SELECT pizza_type_id as id, name, category, ingredients as description FROM pizza_types`
  ).all();

  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const pizzaIndex = daysSinceEpoch % pizzas.length;
  const pizza = pizzas[pizzaIndex];

  const sizes = db.prepare(
    `SELECT size, price FROM pizzas WHERE pizza_type_id = ?`
  ).all(pizza.id);

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

// Restante dos endpoints segue a mesma lógica de substituição

const start = async () => {
  try {
    await server.listen({ port: PORT });
    console.log(`Server listening on port ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
