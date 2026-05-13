// API Client — connects browser to Fastify server (fallback: localStorage)
// API_BASE is configured per-environment. Default: http://localhost:3000

var API_BASE = (window.API_BASE || 'http://localhost:3000');

var ApiClient = {
  // --- Auth ---
  async login(email, password) {
    try {
      var res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });
      var data = await res.json();
      if (data.token) { localStorage.setItem('api_token', data.token); return data; }
      return null;
    } catch (e) { return null; }
  },

  getToken() { return localStorage.getItem('api_token'); },

  // --- Tasks ---
  async createTask(payload) {
    var token = this.getToken();
    if (!token) return this._fallbackCreate('tasks', { payload: payload, status: 'created', createdAt: new Date().toISOString() });
    try {
      var res = await fetch(API_BASE + '/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ payload: payload }),
      });
      return await res.json();
    } catch (e) { return this._fallbackCreate('tasks', { payload: payload, status: 'created', createdAt: new Date().toISOString() }); }
  },

  async getTask(id) {
    try {
      var res = await fetch(API_BASE + '/task/' + id);
      return await res.json();
    } catch (e) { return null; }
  },

  // --- Agents ---
  async getAgents() {
    try {
      var res = await fetch(API_BASE + '/agents');
      var json = await res.json();
      return (json && json.data) || [];
    } catch (e) { return []; }
  },

  async registerAgent(name, model, provider, systemPrompt) {
    var token = this.getToken();
    if (!token) return null;
    try {
      var res = await fetch(API_BASE + '/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ name: name, model: model, provider: provider, systemPrompt: systemPrompt }),
      });
      return await res.json();
    } catch (e) { return null; }
  },

  async revokeAgent(id, reason) {
    var token = this.getToken();
    if (!token) return null;
    try {
      var res = await fetch(API_BASE + '/agents/' + id + '/revoke', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ reason: reason || 'Revoked via UI' }),
      });
      return await res.json();
    } catch (e) { return null; }
  },

  // --- Policies ---
  async getPolicies() {
    try {
      var res = await fetch(API_BASE + '/policies');
      var json = await res.json();
      return (json && json.data) || [];
    } catch (e) { return []; }
  },

  async createPolicy(name, rules, scope, priority) {
    var token = this.getToken();
    if (!token) return null;
    try {
      var res = await fetch(API_BASE + '/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ name: name, rules: rules, scope: scope, priority: priority }),
      });
      return await res.json();
    } catch (e) { return null; }
  },

  // --- Runs ---
  async startRun(agentId, taskId) {
    var token = this.getToken();
    if (!token) return null;
    try {
      var res = await fetch(API_BASE + '/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ agentId: agentId, taskId: taskId }),
      });
      return await res.json();
    } catch (e) { return null; }
  },

  async completeRun(runId) {
    var token = this.getToken();
    if (!token) return null;
    try {
      var res = await fetch(API_BASE + '/run/' + runId + '/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({}),
      });
      return await res.json();
    } catch (e) { return null; }
  },

  // --- Logs ---
  async logAction(runId, tool, decision, parameters, reason) {
    var token = this.getToken();
    if (!token) return null;
    try {
      var res = await fetch(API_BASE + '/run/' + runId + '/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ tool: tool, decision: decision, parameters: parameters, reason: reason }),
      });
      return await res.json();
    } catch (e) { return null; }
  },

  // --- Legacy: Credential Apps (localStorage fallback) ---
  getApps() { return JSON.parse(localStorage.getItem('passport_apps') || '[]'); },
  saveApps(apps) { localStorage.setItem('passport_apps', JSON.stringify(apps)); },

  _fallbackCreate(coll, doc) {
    var id = coll + '_' + Date.now().toString(36);
    doc.id = id;
    var apps = this.getApps();
    apps.push(doc);
    this.saveApps(apps);
    return doc;
  },
};
