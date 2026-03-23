const BASE = "https://xodeon-cloud-backend--gamerdu54n2.replit.app/api";

const h = (key: string) => ({ "Content-Type": "application/json", "x-api-key": key });

export const xodeon = {
  list: (col: string, apiKey: string) =>
    fetch(`${BASE}/data/${col}`, { headers: h(apiKey) }).then(r => r.json()),

  get: (col: string, id: string, apiKey: string) =>
    fetch(`${BASE}/data/${col}/${id}`, { headers: h(apiKey) }).then(r => r.json()),

  create: (col: string, data: object, apiKey: string) =>
    fetch(`${BASE}/data/${col}`, { method: "POST", headers: h(apiKey), body: JSON.stringify({ data }) }).then(r => r.json()),

  update: (col: string, id: string, data: object, apiKey: string) =>
    fetch(`${BASE}/data/${col}/${id}`, { method: "PUT", headers: h(apiKey), body: JSON.stringify({ data }) }).then(r => r.json()),

  remove: (col: string, id: string, apiKey: string) =>
    fetch(`${BASE}/data/${col}/${id}`, { method: "DELETE", headers: h(apiKey) }).then(r => r.json()),

  collections: (apiKey: string) =>
    fetch(`${BASE}/data`, { headers: h(apiKey) }).then(r => r.json()),
};
