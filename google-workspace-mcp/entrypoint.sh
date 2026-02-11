#!/bin/bash
set -e

# Read secrets from Docker secrets files and export as env vars
if [ -f /run/secrets/gdrive_client_id ]; then
    export GOOGLE_OAUTH_CLIENT_ID=$(cat /run/secrets/gdrive_client_id)
fi

if [ -f /run/secrets/gdrive_client_secret ]; then
    export GOOGLE_OAUTH_CLIENT_SECRET=$(cat /run/secrets/gdrive_client_secret)
fi

# Start the MCP server
exec uv run main.py --transport streamable-http ${TOOL_TIER:+--tool-tier "$TOOL_TIER"} ${TOOLS:+--tools $TOOLS}
