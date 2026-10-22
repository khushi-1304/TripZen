# 🧭 TripZen — AI Travel Planner Powered by LangGraph Agents

TripZen takes a plain-English trip request and turns it into a ready-to-use travel plan: flight options, hotel suggestions, and a day-by-day itinerary. Under the hood, a team of specialized AI agents is orchestrated with LangGraph, served through FastAPI, and traced end-to-end with LangSmith.

## Why TripZen?

Planning a trip usually means juggling flight sites, hotel listings, blogs, and notes. TripZen collapses all of that into one conversation. You describe the trip, and the agents handle the research:

- a **flight agent** that looks up route and flight information,
- a **hotel agent** that searches the web for places to stay,
- an **itinerary agent** that builds a realistic day-wise plan, and
- a **response agent** that merges everything into one clean answer.

## Features

- ✈️ Flight lookup via the AviationStack API
- 🏨 Hotel discovery via Tavily web search
- 🧠 Multi-agent orchestration with LangGraph
- 🗓️ Structured, day-by-day itinerary generation
- 🔍 Full agent tracing and observability with LangSmith
- 🌐 FastAPI backend with a lightweight web UI
- 💾 Conversation state persisted in PostgreSQL
- ⚡ Fast LLM inference through Groq (model configurable via `.env`)

## Tech Stack

| Layer | Tools |
|---|---|
| Language | Python 3.10+ |
| Backend | FastAPI |
| Frontend | Jinja2, HTML, CSS, JavaScript |
| Agent framework | LangGraph, LangChain |
| LLM provider | Groq |
| Observability | LangSmith |
| Database | PostgreSQL |
| External APIs | Tavily, AviationStack |

## Project Structure

```text
.
├── app.py                # FastAPI app entry point
├── backend.py            # LangGraph workflow (agents + graph)
├── requirements.txt      # Python dependencies
├── static/               # CSS, JS, and other static assets
├── templates/            # HTML templates
└── tools/                # Flight and web-search integrations
```

## Prerequisites

Before running TripZen locally, make sure you have:

- Python 3.10 or newer
- A running PostgreSQL instance you can connect to
- API keys for:
  - Groq
  - Tavily
  - AviationStack
  - LangSmith (for tracing)

## Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY = ""
GROQ_MODEL = ""
DEFAULT_ORIGIN_IATA = "DEL"
AVIATIONSTACK_API_KEY = ""
TAVILY_API_KEY = ""
DATABASE_URL = ""
LANGSMITH_TRACING="true"
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY=""
LANGSMITH_PROJECT="TripZen"
```

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq credentials and the model used by the agents |
| `DEFAULT_ORIGIN_IATA` | Default departure airport code (`DEL` = Delhi) when none is given |
| `AVIATIONSTACK_API_KEY` | Flight data |
| `TAVILY_API_KEY` | Hotel and web search |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/tripzen_db` |
| `LANGSMITH_TRACING` | Set to `"true"` to send traces to LangSmith |
| `LANGSMITH_ENDPOINT` | LangSmith API endpoint |
| `LANGSMITH_API_KEY` | Your LangSmith API key |
| `LANGSMITH_PROJECT` | Project name under which traces are grouped (`TripZen`) |

## Installation

```bash
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Running the App

```bash
python app.py
```

Then open your browser at:

```text
http://127.0.0.1:8000/
```

## API Endpoints

- `GET /health` — health check
- `POST /api/travel` — submit a travel request

Example request:

```bash
curl -X POST http://127.0.0.1:8000/api/travel \
  -H "Content-Type: application/json" \
  -d '{"message":"Plan a 4-day trip from Delhi to Goa under ₹30,000"}'
```

## How the Workflow Works

1. The user sends a trip request in natural language.
2. The **flight agent** gathers flight options for the route.
3. The **hotel agent** searches for suitable stays.
4. The **itinerary agent** builds a practical day-by-day plan.
5. The **response agent** combines everything into one polished reply.

## Observability with LangSmith

TripZen is integrated with [LangSmith](https://smith.langchain.com) so every agent run can be inspected instead of treated as a black box. With `LANGSMITH_TRACING="true"` and a valid API key, each request to `/api/travel` is traced automatically under the **TripZen** project.

In the LangSmith dashboard you can:

- follow a request step by step through the LangGraph nodes (flight → hotel → itinerary → final response),
- inspect the exact prompts, tool calls, and outputs at each step,
- track latency and token usage per run and per node,
- debug failures, such as a bad tool response or an unexpected LLM output, by replaying the trace.

To turn tracing off, set `LANGSMITH_TRACING="false"` or remove the LangSmith variables. The app works fine without them.

## Acknowledgments

TripZen is built on LangGraph, LangChain, Groq, Tavily, AviationStack, and LangSmith, as a practical example of combining multi-agent workflows with real-world APIs.