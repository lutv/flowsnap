#!/usr/bin/env node
/**
 * FlowSnap Model Context Protocol (MCP) Server Entrypoint
 * Communicates via JSON-RPC 2.0 stdio with AI Agents (Antigravity, Claude, Cursor, Windsurf)
 */

import { FlowSnapMCPServer } from '../src/mcp_server.mjs';

const server = new FlowSnapMCPServer();
server.startStdio();
