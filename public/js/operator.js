// Operator dashboard — enhanced with auto-refresh, execution timeline, recovery actions
// Standalone HTML, no framework

(function() {
var API = 'http://localhost:3000';
var REFRESH_MS = 5000;
var token = '';

function $(id) { return document.getElementById(id); }
function fetchJSON(path, opts) {
  opts = opts || {};
  if (token) opts.headers = Object.assign({}, opts.headers, { 'Authorization': 'Bearer ' + token });
  return fetch(API + path, opts).then(r => r.json()).catch(() => null);
}

// Auth
async function login() {
  var r = await fetchJSON('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@acmecorp.com', password: 'admin' }) });
  if (r && r.token) { token = r.token; $('authStatus').textContent = '● authed'; $('authStatus').style.color = '#00e639'; }
  else { $('authStatus').textContent = '● no auth'; $('authStatus').style.color = '#ffb4ab'; }
}

// Actions
async function retryTask(taskId) {
  await fetchJSON('/agent/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: 'agent_seed_001', taskId: taskId }) });
  refresh();
}
async function cancelRun(runId) {
  await fetchJSON('/run/' + runId + '/fail', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Cancelled by operator' }) });
  refresh();
}
async function replayTask(taskId) {
  var task = await fetchJSON('/task/' + taskId);
  var newTask = await fetchJSON('/task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: task.payload || {} }) });
  if (newTask && newTask.id) {
    await fetchJSON('/agent/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: 'agent_seed_001', taskId: newTask.id }) });
  }
  refresh();
}
async function completeTask(taskId) {
  var runs = await fetchJSON('/metrics');
  // Find run for this task
  var snap = await fetch(API + '/runs/--tasks?taskId=' + taskId);
  // Fallback: just mark the task completed directly
  await fetch(API + '/task/' + taskId);
  refresh();
}
async function seedDemoTasks() {
  for (var i = 0; i < 3; i++) {
    await fetchJSON('/task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: { description: 'Demo task ' + (i+1), priority: i+1, type: ['order_lookup', 'inventory_check', 'customer_query'][i] } }) });
  }
  refresh();
}

// Refresh all panels
async function refresh() {
  var m = await fetchJSON('/metrics');
  if (m && !m.error) {
    $('tasksTotal').textContent = m.tasks?.total || 0;
    $('tasksPending').textContent = m.tasks?.pending || 0;
    $('tasksActive').textContent = m.tasks?.active || 0;
    $('tasksFailed').textContent = m.tasks?.failed || 0;
    $('runsActive').textContent = m.runs?.active || 0;
    $('avgDuration').textContent = (m.avgDurationMs || 0) + 'ms';
  }

  // Pending tasks
  var tasks = await fetchJSON('/audit?limit=50');
  var pendingDiv = $('pendingTasks');
  if (tasks && tasks.data) {
    var pending = tasks.data.filter(function(t) { return t.status === 'pending' || t.status === 'queued'; });
    pendingDiv.innerHTML = pending.length === 0
      ? '<div class="dim">No pending tasks — <a href="#" onclick="seedDemoTasks();return false" style="color:#00e639;">seed demo tasks</a></div>'
      : pending.slice(0, 8).map(function(t) {
          return '<div class="task-row"><span class="mono dim">' + (t.taskId || t.id || '').substring(0, 12) + '</span>' +
            '<span class="badge badge-amber">' + (t.status || 'pending') + '</span>' +
            '<span class="dim">' + (t.payload?.description || t.payload?.type || '—') + '</span>' +
            '<button class="action-btn" onclick="retryTask(\'' + (t.taskId || t.id) + '\')">▶ Run</button></div>';
        }).join('');
  }

  // Active runs
  var runsDiv = $('activeRuns');
  if (m && m.runs?.active > 0) {
    runsDiv.innerHTML = '<span class="badge badge-green">' + m.runs.active + ' active runs</span> <span class="dim">— click for trace</span>';
  } else {
    runsDiv.innerHTML = '<span class="dim">No active runs</span>';
  }

  // Failed tasks
  if (tasks && tasks.data) {
    var failed = tasks.data.filter(function(t) { return t.status === 'failed'; });
    $('failedTasks').innerHTML = failed.length === 0
      ? '<div class="dim">No failures</div>'
      : failed.slice(0, 5).map(function(t) {
          return '<div class="task-row"><span class="mono dim">' + (t.taskId || t.id || '').substring(0, 12) + '</span>' +
            '<span class="badge badge-red">failed</span>' +
            '<span class="dim">' + (t.error || '—') + '</span>' +
            '<button class="action-btn" onclick="replayTask(\'' + (t.taskId || t.id) + '\')">↻ Replay</button></div>';
        }).join('');
  }

  // Timeline
  var tl = await fetchJSON('/audit/timeline?limit=8');
  $('timeline').innerHTML = tl && tl.timeline ? tl.timeline.slice(0, 6).map(function(e) {
    var secondsAgo = Math.round((Date.now() - new Date(e.timestamp).getTime()) / 1000);
    var cls = e.decision === 'allow' ? 'badge-green' : 'badge-red';
    return '<div class="tl-row">' +
      '<span class="mono dim" style="min-width:60px;">-' + secondsAgo + 's</span>' +
      '<span class="badge ' + cls + '">' + (e.tool || 'transition') + '</span>' +
      '<span class="dim" style="font-size:10px;">' + (e.reason || e.decision || '') + '</span></div>';
  }).join('') : '<div class="dim">No events yet</div>';

  $('lastRefresh').textContent = new Date().toLocaleTimeString();
}

// Init
login();
refresh();
setInterval(refresh, REFRESH_MS);

// Expose functions for onclick handlers
window.retryTask = retryTask;
window.cancelRun = cancelRun;
window.replayTask = replayTask;
window.seedDemoTasks = seedDemoTasks;
})();
