import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs"; // Para carregar os arquivos JSON

const server = fastify({
  logger: {
    transport: {
      target: "pino-pretty",
    },
  },
});

const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar os dados dos arquivos JSON
const pizzaTypes = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "pizza_types.json")));
const pizzas = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "pizzas.json")));
const orders = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "orders.json")));
const orderDetails = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "order_details.json")));

// Registrar arquivos estáticos
server.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/public/",
});

// Endpoint: Obter todas as pizzas
server.get("/api/pizzas", (req, res) => {
  try {
    const responsePizzas = pizzaTypes.map((pizzaType) => {
      const sizes = pizzas
        .filter((pizza) => pizza.pizza_type_id === pizzaType.pizza_type_id)
        .reduce((acc, pizza) => {
          acc[pizza.size] = parseFloat(pizza.price); // Converte para número
          return acc;
        }, {});
      return {
        id: pizzaType.pizza_type_id,
        name: pizzaType.name,
        category: pizzaType.category,
        description: pizzaType.ingredients,
        image: `/public/pizzas/${pizzaType.pizza_type_id}.webp`,
        sizes,
      };
    });

    res.send(responsePizzas);
  } catch (error) {
    req.log.error(error);
    res.status(500).send({ error: "Erro ao buscar as pizzas." });
  }
});

// Endpoint: Pizza do dia
server.get("/api/pizza-of-the-day", (req, res) => {
  try {
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const pizzaIndex = daysSinceEpoch % pizzaTypes.length;
    const pizza = pizzaTypes[pizzaIndex];
    const sizes = pizzas
      .filter((p) => p.pizza_type_id === pizza.pizza_type_id)
      .reduce((acc, p) => {
        acc[p.size] = parseFloat(p.price);
        return acc;
      }, {});

    const responsePizza = {
      id: pizza.pizza_type_id,
      name: pizza.name,
      category: pizza.category,
      description: pizza.ingredients,
      image: `/public/pizzas/${pizza.pizza_type_id}.webp`,
      sizes,
    };

    res.send(responsePizza);
  } catch (error) {
    req.log.error(error);
    res.status(500).send({ error: "Erro ao buscar a pizza do dia." });
  }
});

// Endpoint: Obter pedidos
server.get("/api/orders", (req, res) => {
  try {
    res.send(orders);
  } catch (error) {
    req.log.error(error);
    res.status(500).send({ error: "Erro ao buscar pedidos." });
  }
});

// Endpoint: Obter detalhes dos pedidos
server.get("/api/order_details", (req, res) => {
  try {
    res.send(orderDetails);
  } catch (error) {
    req.log.error(error);
    res.status(500).send({ error: "Erro ao buscar os detalhes dos pedidos." });
  }
});

// Endpoint: Obter todos os tipos de pizza
server.get("/api/pizza_types", (req, res) => {
  try {
    res.send(pizzaTypes);
  } catch (error) {
    req.log.error(error);
    res.status(500).send({ error: "Erro ao buscar os tipos de pizza." });
  }
});

// Endpoint: Obter detalhes de um pedido
server.get("/api/orders/:orderId", (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const order = orders.find((o) => o.order_id === orderId);

    if (!order) {
      res.status(404).send({ error: "Pedido não encontrado." });
      return;
    }

    const details = orderDetails
      .filter((detail) => detail.order_id === orderId)
      .map((detail) => {
        const pizza = pizzas.find((p) => p.pizza_id === detail.pizza_id);
        const type = pizzaTypes.find((t) => t.pizza_type_id === pizza.pizza_type_id);
        return {
          quantity: detail.quantity,
          pizza: {
            id: pizza.pizza_id,
            name: type.name,
            size: pizza.size,
            price: parseFloat(pizza.price),
          },
        };
      });

    res.send({ order, details });
  } catch (error) {
    req.log.error(error);
    res.status(500).send({ error: "Erro ao buscar detalhes do pedido." });
  }
});

// Inicializar o servidor
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`📂 Imagens disponíveis em http://localhost:${PORT}/public/`);
  } catch (err) {
    console.error("Erro ao iniciar o servidor:", err);
    process.exit(1);
  }
};

start();
