# Node.js bridge to the Python AI microservice
# Accessible at POST /api/ai/summarize/:id and POST /api/ai/evaluate/:id
# Proxies to the FastAPI sidecar running on AI_SERVICE_URL
#
# Now also supports:
#   POST /api/ai/embed/:id          — store embedding for a Proposal document
#   POST /api/ai/similarity/:id     — check similarity against other proposals
#   GET  /api/ai/similarity/:id     — list stored embeddings to compare against

