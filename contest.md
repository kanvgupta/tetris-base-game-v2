Buildathon: 2025-02-flash
Flashblocks Builder Side Quest
With Flashblocks, a technology built by Flashbots, Base chain will have 200-millisecond block times. This will make Base 10x faster than it is today, and the fastest EVM chain to date.

To celebrate this, we're running a one day Builder Side Quest with a 2 ETH prize pool!

Prompt
Build a mobile-friendy web app that showcases the 10x speed improvement of Flashblocks on Base Sepolia:

Should be able to view 2s full blocks
Should be able to view 200ms flashblocks
(Bonus) Should be able to submit a tx and see how much faster it lands in a flashblock than a full block
Submissions are due by 2pm MNT (GMT-7) on Friday 2/28 and will be judged on clarity and creativity, by members of the @buildonbase chain team, Base DevRel team, and Flashbots team.

Winners will be announced Fri 2/28 3pm MT at the Home Base booth and on socials — join us for free pizza and flashblocks demo

Base Sepolia Flashblock RPC Endpoint

https://sepolia-preconf.base.org
Prizes
A total of 2 ETH in prizes with the 1st place receiving 1 ETH.

Submission Details
Deadline: Submit by 2pm MNT (GMT-7) on Friday 2/28

Submission: Submit your build by replying on this X post with the hashtag #baseflash.

Results: Join us at 3pm the Home Base booth in the main hall at ETH Denver for pizza and the live announcement of the winners.

Start Building
Visit our Flashblocks page for comprehensive documentation on how to build with Flashblocks, including detailed examples and response formats.

Flashblocks is enabled for developers on Base Sepolia, providing ultra-fast 200-millisecond block times. You can integrate with Flashblocks in two ways:

Flashblock WebSocket endpoint
Stream real-time block updates over a WebSocket connection at:

wss://sepolia.flashblocks.base.org/ws
This endpoint returns a stream of Flashblocks with differential data between blocks to minimize bandwidth usage. The initial block contains complete data while subsequent blocks only include changes.

Flashblock RPC endpoint
Query the Flashblocks-aware RPC endpoint at:

https://sepolia-preconf.base.org
This endpoint supports all standard Ethereum JSON-RPC methods plus Flashblocks-specific functionality. You can use the pending tag to retrieve the latest Flashblock:

curl https://sepolia-preconf.base.org \
 -X POST \
 -H "Content-Type: application/json" \
 -d '{
"jsonrpc": "2.0",
"method": "eth_getBlockByNumber",
"params": ["pending", true],
"id": 1
}'
