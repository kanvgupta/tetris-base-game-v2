Integrating Flashblocks
Flashblocks is enabled for developers on Base Sepolia. There are two ways you can integrate with Flashblocks data. You can either use the WebSocket API to stream real-time block updates, or use the RPC API to query the Flashblocks-aware RPC endpoint.

WebSocket API
Stream realtime block updates over a WebSocket.

You can connect to the websocket endpoint with any WebSocket library of CLI tool. The endpoint is available at wss://sepolia.flashblocks.base.org/ws.

Two recommended tools for connecting to the WebSocket endpoint are Websocat and the Javascript Websocket Client.

Websocat Example
Firstly install websocat, following these instructions.

From your terminal, you can then connect to the websocket stream by running:

websocat wss://sepolia.flashblocks.base.org/ws
In your terminal, you'll see a stream of all the Flashblocks being sent over the websocket connection.

Interpreting the data
To minimize the amount of data sent to clients, each Flashblock only includes the diff data from the previous block. The initial Flashblock (when index is zero) includes the block properties (e.g. number, gas limit) and the subsequent Flashblocks only include the diff data (e.g. transactions that are present in that Flashblock).

Example Initial Response
Example Diff Response
RPC API
Flashblock aware RPC endpoint.

You can use the Flashblocks aware RPC endpoint at https://sepolia-preconf.base.org

In addition to these flashblock-specific methods, all standard Ethereum JSON-RPC methods are supported as usual.

eth_getBlockByNumber
Use the pending tag to retrieve the latest Flashblock.

curl https://sepolia-preconf.base.org \
 -X POST \
 -H "Content-Type: application/json" \
 -d '{
"jsonrpc": "2.0",
"method": "eth_getBlockByNumber",
"params": ["pending", true],
"id": 1
}'

Hide Response
{
"jsonrpc": "2.0",
"id": 1,
"result": {
"number": "0x1234",
"hash": "0x...",
"transactions": [...]
}
}
eth_getTransactionReceipt
Use the existing receipt RPC to get preconfirmed receipts

curl https://sepolia-preconf.base.org \
 -X POST \
 -H "Content-Type: application/json" \
 -d '{
"jsonrpc": "2.0",
"method": "eth_getTransactionReceipt",
"params": ["0x..."],
"id": 1
}'

Hide Response
{
"jsonrpc": "2.0",
"id": 1,
"result": {
"transactionHash": "0x...",
"blockNumber": "0x1234",
"status": "0x1"
}
}
eth_getBalance
Use the pending tag

curl https://sepolia-preconf.base.org \
 -X POST \
 -H "Content-Type: application/json" \
 -d '{
"jsonrpc": "2.0",
"method": "eth_getBalance",
"params": ["0x...", "pending"],
"id": 1
}'

Hide Response
{
"jsonrpc": "2.0",
"id": 1,
"result": "0x0234"
}
