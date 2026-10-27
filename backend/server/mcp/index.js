import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
    await createServer().connect(new StdioServerTransport());
}

main().catch(() => {
    process.stderr.write('Unable to start booking MCP server.\n');
    process.exitCode = 1;
});
