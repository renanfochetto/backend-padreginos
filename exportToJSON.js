import sqlite3 from "sqlite3";
import fs from "fs";

// Caminho para o arquivo SQLite
const dbPath = "./pizza.sqlite";

// Pasta para salvar os arquivos JSON
const outputDir = "./data";

// Certifique-se de que a pasta de saída exista
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Inicializar o banco de dados SQLite
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados SQLite:", err.message);
    process.exit(1);
  } else {
    console.log("Conectado ao banco de dados SQLite.");
  }
});

// Função para exportar dados de uma tabela para JSON
const exportTable = (tableName, outputFileName) => {
  const query = `SELECT * FROM ${tableName}`;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(`Erro ao buscar dados da tabela ${tableName}:`, err.message);
      return;
    }
    fs.writeFileSync(
      `${outputDir}/${outputFileName}`,
      JSON.stringify(rows, null, 2)
    );
    console.log(`✅ Dados exportados para ${outputFileName}`);
  });
};

// Exportar tabelas para JSON
exportTable("pizza_types", "pizza_types.json");
exportTable("pizzas", "pizzas.json");
exportTable("orders", "orders.json");
exportTable("order_details", "order_details.json");

// Fechar o banco de dados após a exportação
db.close((err) => {
  if (err) {
    console.error("Erro ao fechar o banco de dados:", err.message);
  } else {
    console.log("Conexão com o banco de dados encerrada.");
  }
});
