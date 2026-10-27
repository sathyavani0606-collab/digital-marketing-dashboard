
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "agents.json");

app.use(express.json());
app.use(express.static(__dirname));

function readAgents() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Could not read agents.json:", error.message);
  }
  return [];
}

function writeAgents(agents) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(agents, null, 2));
}

app.get("/api/health", (req, res) => {
  res.json({ message: "AgentFlow backend is working!" });
});

app.get("/api/agents", (req, res) => {
  res.json(readAgents());
});

app.post("/api/agents", (req, res) => {
  const { name, email, role, status } = req.body;

  if (!name || !email || !role || !["Available", "Busy"].includes(status)) {
    return res.status(400).json({ error: "Valid name, email, role and status are required." });
  }

  const agents = readAgents();
  if (agents.some(agent => agent.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(409).json({ error: "An agent with this email already exists." });
  }

  const agent = {
    id: `agent-${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    role: role.trim(),
    status,
    color: agents.length % 6
  };

  agents.push(agent);
  writeAgents(agents);
  res.status(201).json(agent);
});

app.put("/api/agents/:id", (req, res) => {
  const agents = readAgents();
  const index = agents.findIndex(agent => agent.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Agent not found." });
  }

  const { name, email, role, status } = req.body;
  if (!name || !email || !role || !["Available", "Busy"].includes(status)) {
    return res.status(400).json({ error: "Valid name, email, role and status are required." });
  }

  if (agents.some(agent => agent.email.toLowerCase() === email.trim().toLowerCase() && agent.id !== req.params.id)) {
    return res.status(409).json({ error: "An agent with this email already exists." });
  }

  agents[index] = {
    ...agents[index],
    name: name.trim(),
    email: email.trim(),
    role: role.trim(),
    status
  };

  writeAgents(agents);
  res.json(agents[index]);
});

app.patch("/api/agents/:id/status", (req, res) => {
  const agents = readAgents();
  const agent = agents.find(item => item.id === req.params.id);

  if (!agent) {
    return res.status(404).json({ error: "Agent not found." });
  }

  if (!["Available", "Busy"].includes(req.body.status)) {
    return res.status(400).json({ error: "Status must be Available or Busy." });
  }

  agent.status = req.body.status;
  writeAgents(agents);
  res.json(agent);
});

app.delete("/api/agents/:id", (req, res) => {
  const agents = readAgents();
  const remaining = agents.filter(agent => agent.id !== req.params.id);

  if (remaining.length === agents.length) {
    return res.status(404).json({ error: "Agent not found." });
  }

  writeAgents(remaining);
  res.json({ message: "Agent deleted successfully." });
});

app.listen(PORT, () => {
  console.log(`AgentFlow server running at http://localhost:${PORT}`);
});
