# CrewAI Integration Guide

Integrate Passport Agent with CrewAI to enforce policies across multi-agent
crews, ensuring every agent's tool calls are validated.

---

## Overview

CrewAI orchestrates multiple AI agents working together. Passport Agent
ensures each agent in the crew follows its assigned policies — no agent
can exceed its permissions, regardless of the task it receives.

```
┌────────────────────────────────────────────────────────┐
│                    CrewAI Crew                         │
│                                                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │ Agent A  │    │ Agent B  │    │ Agent C  │         │
│  │ (search) │    │ (analyze)│    │ (report) │         │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘         │
│       │               │               │               │
└───────┼───────────────┼───────────────┼───────────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐
│ Passport Policy  │ │ Passport Policy  │ │ Passport     │
│ (Safe Search)    │ │ (Read-Only SQL)  │ │ (No Export)  │
└──────────────────┘ └──────────────────┘ └──────────────┘
```

## Prerequisites

- Node.js >= 20
- Running Passport Agent server
- Python 3.10+ (CrewAI is Python-based)
- CrewAI installed: `pip install crewai`

```bash
npm install @passport-agent/sdk
pip install crewai
```

## Step 1: Register Each Agent in the Crew

Every agent in your CrewAI crew gets its own Passport identity:

```python
import requests
import os

PASSPORT_URL = os.getenv('PASSPORT_API_URL', 'http://localhost:3000')
PASSPORT_KEY = os.getenv('PASSPORT_API_KEY')

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {PASSPORT_KEY}',
}

def register_agent(name, model, system_prompt):
    resp = requests.post(
        f'{PASSPORT_URL}/agents/register',
        json={'name': name, 'model': model, 'provider': 'openai', 'systemPrompt': system_prompt},
        headers=headers,
    )
    data = resp.json()
    return data['agentId']

researcher_id = register_agent(
    'Market Researcher',
    'gpt-4o',
    'You research market trends and competitor data.',
)

analyst_id = register_agent(
    'Data Analyst',
    'gpt-4-turbo',
    'You analyze data and generate insights.',
)

writer_id = register_agent(
    'Report Writer',
    'gpt-4o',
    'You write formatted reports from analysis results.',
)
```

## Step 2: Create Per-Agent Policies

Each agent gets its own policy — least privilege principle:

```python
def create_policy(agent_id, name, priority, rules):
    return requests.post(
        f'{PASSPORT_URL}/policies',
        json={
            'name': name,
            'priority': priority,
            'scope': {'agentId': agent_id},
            'rules': rules,
        },
        headers=headers,
    ).json()

# Researcher: web search only, restricted domains
create_policy(researcher_id, 'Safe Research', 10, {
    'allowedTools': [{'toolName': 'web_search', 'parameterConstraints': {'query': {'type': 'string', 'maxLength': 200}}}],
    'allowedDomains': [{'pattern': '*.wikipedia.org', 'methods': ['GET']}, {'pattern': '*.crunchbase.com', 'methods': ['GET']}],
    'deniedDomains': ['169.254.169.254'],
    'dataRestrictions': {'denyPiiInParameters': True},
})

# Analyst: read-only SQL, sandboxed Python
create_policy(analyst_id, 'Read-Only Analysis', 10, {
    'allowedTools': [
        {'toolName': 'db_query', 'parameterConstraints': {'sql': {'type': 'string', 'pattern': '^SELECT|^WITH'}}},
        {'toolName': 'sandbox_run', 'parameterConstraints': {'language': {'type': 'string', 'enum': ['python']}, 'timeout': {'type': 'number', 'max': 30}}},
    ],
    'deniedTools': ['db_write', 'export_csv'],
    'dataRestrictions': {'denyPiiInParameters': True},
})

# Writer: generate reports, no exports
create_policy(writer_id, 'Report Only', 10, {
    'allowedTools': ['generate_report', 'format_table', 'create_visualization'],
    'deniedTools': ['export_csv', 'export_json', 'email_data'],
})
```

## Step 3: Create Passport-Enforced Tool Wrapper for CrewAI

Wrap CrewAI tools with enforcement:

```python
def enforce(agent_id, tool_name, parameters):
    """Call Passport enforcement before executing a tool."""
    resp = requests.post(
        f'{PASSPORT_URL}/enforce',
        json={
            'intent': {
                'intentId': f'crew_{int(time.time() * 1000)}',
                'agentId': agent_id,
                'tool': tool_name,
                'parameters': parameters,
            }
        },
        headers=headers,
    )
    result = resp.json()

    if result.get('decision') == 'deny':
        raise PermissionError(f"Tool '{tool_name}' blocked: {result.get('reason')}")

    return result


def passport_enforced_tool(agent_id, base_tool):
    """Decorator to wrap a CrewAI tool with Passport enforcement."""
    from functools import wraps

    @wraps(base_tool)
    def wrapper(*args, **kwargs):
        # Enforce
        enforce(agent_id, base_tool.__name__, kwargs)

        # Execute if allowed
        return base_tool(*args, **kwargs)

    return wrapper
```

## Step 4: Assemble the Crew

```python
from crewai import Agent, Task, Crew

# Define agents with Passport-enforced tools
researcher = Agent(
    role='Market Researcher',
    goal='Find market data and competitor information',
    backstory='Expert at web research and data gathering',
    tools=[passport_enforced_tool(researcher_id, web_search_tool)],
    allow_delegation=False,
)

analyst = Agent(
    role='Data Analyst',
    goal='Analyze data and identify trends',
    backstory='Skilled data scientist with SQL and Python expertise',
    tools=[
        passport_enforced_tool(analyst_id, db_query_tool),
        passport_enforced_tool(analyst_id, python_sandbox_tool),
    ],
    allow_delegation=False,
)

writer = Agent(
    role='Report Writer',
    goal='Create polished market analysis reports',
    backstory='Professional business writer',
    tools=[passport_enforced_tool(writer_id, report_generator_tool)],
    allow_delegation=False,
)

# Define tasks
research_task = Task(
    description='Research the top 5 competitors in the AI agent security space.',
    agent=researcher,
)

analysis_task = Task(
    description='Analyze the research data and identify market gaps.',
    agent=analyst,
    context=[research_task],
)

report_task = Task(
    description='Write a comprehensive market analysis report.',
    agent=writer,
    context=[analysis_task],
)

# Run the crew — enforcement happens automatically
crew = Crew(agents=[researcher, analyst, writer], tasks=[research_task, analysis_task, report_task])
result = crew.kickoff()
print(result)
```

## Step 5: Monitor Across the Crew

View all enforcement activity across your crew:

```python
def get_crew_audit_log(agent_ids, minutes=60):
    """Retrieve audit logs for all agents in the crew."""
    all_logs = []
    for agent_id in agent_ids:
        resp = requests.get(
            f'{PASSPORT_URL}/audit/logs?agentId={agent_id}&minutes={minutes}',
            headers=headers,
        )
        all_logs.extend(resp.json().get('logs', []))
    return sorted(all_logs, key=lambda l: l['timestamp'], reverse=True)
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **CrewAI is Python, Passport is Node** | Use HTTP calls (the REST API) — the protocol is the same regardless of language |
| **Agent delegation bypass** | Set `allow_delegation=False` or enforce policies on delegated tasks too |
| **Sequential vs parallel** | CrewAI runs tasks sequentially by default; parallel tasks each get independent enforcement |
| **Task context leakage** | Passport doesn't see task context — only tool parameters — add data restrictions in policies |
| **Rate limiting** | Large crews may hit rate limits; batch enforcements where possible |

## Architecture Note

CrewAI runs agents _in-process_ in Python. Passport Agent runs _out-of-process_ as a
separate HTTP service. This separation is intentional — security controls shouldn't
live in the same process as the agent.

## Full Example

See `examples/crewai-integration.py` (forthcoming) for a complete runnable example.

## Next Steps

- [OpenAI Integration](./openai.md)
- [Anthropic Integration](./anthropic.md)
- [LangChain Integration](./langchain.md)
- [Custom Integration](./custom.md)
