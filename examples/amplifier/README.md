## Introduction

This repo provides the code for interacting with the Amplifier Relayer API to relay transactions to the Axelar network and listen to Axelar events. 

For a visual of the flow of an outgoing message see [outgoing msg](/images/Outgoing-Relayer.png)
For a visual of the flow of an inbound message see [inbound msg](/images/Inbound-Relayer.png)

## Setup

1. Clone this repo.
1. Install dependencies:
   ```bash
   npm install
   ```
1. Copy `.env.example` into `.env` and set up the following environment variables:
   ```bash
   HOST=...
   PORT=...
   ```

## Generic endpoints

There are two endpoints that can be used for generic commands and events:

1. `broadcast` -- Sends a command to get executed as a wasm message on the network
1. `subscribe-to-wasm-events` -- Subscribes to all wasm events emitted on the network

### `broadcast`

To broadcast a command, use the following:

```bash
$ node amplifier broadcast \
--address <destination contract> \
--payload <execute message>
```
For example, call `distribute_rewards()` on the `Rewards` contract to distribute rewards:

```bash
$ node amplifier broadcast \
--address axelar1wkwy0xh89ksdgj9hr347dyd2dw7zesmtrue6kfzyml4vdtz6e5ws2pvc5e \
--payload '{"distribute_rewards":{"pool_id":{"chain_name":"fantom","contract":"axelar1ufs3tlq4umljk0qfe8k5ya0x6hpavn897u2cnf9k0en9jr7qarqqa9263g"},"epoch_count":1000}}'
Broadcasting message:
axelar1wkwy0xh89ksdgj9hr347dyd2dw7zesmtrue6kfzyml4vdtz6e5ws2pvc5e {"distribute_rewards":{"pool_id":{"chain_name":"fantom","contract":"axelar1ufs3tlq4umljk0qfe8k5ya0x6hpavn897u2cnf9k0en9jr7qarqqa9263g"},"epoch_count":1000}}
Connecting to server at localhost:50051
Message sent for broadcast
```

### `subscribe-to-wasm-events`

To get all wasm events emitted on the Axelar network, run:

```bash
node amplifier subscribe-to-wasm-events
```

You can optionally specify a `start-height` to catch events that were emitted at a previous time with the `--start-height` flag. It is set to `0` by default, which means that subscription starts from the current tip of the chain:

```
$ node amplifier subscribe-to-wasm-events --start-height 221645
Subscribing to events starting from block: 221645
Connecting to server at localhost:50051
Event: {
  type: 'wasm-voted',
  attributes: [
    {
      key: '_contract_address',
      value: 'axelar1466nf3zuxpya8q9emxukd7vftaf6h4psr0a07srl5zw74zh84yjq4687qd'
    },
    { key: 'poll_id', value: '"1"' },
    {
      key: 'voter',
      value: 'axelar1hzy33ue3a6kztvfhrv9mge45g2x33uct4ndzcy'
    }
  ],
  height: Long { low: 221645, high: 0, unsigned: true }
}
```

Every event includes a `type` field that specifies the type of the event, an `attributes` field with all relevant information, and a `height` event that specifies the height emitted.

## General Message Passing

The following endpoints are available to facilitate GMP calls:

1. `verify` -- triggers a verification on the source chain (routing is handled automatically)
2. `subscribe-to-approvals` -- creates a channel to return all calls that are approved on the destination chain 
3. `get-payload` -- queries the payload of the initial source-chain transaction by its hash

### `verify`

Given a transaction relayed on the source chain, the `verify` command is called as follows:

``` bash
node amplifier verify \
--id 0x02293467b9d6e1ce51d8ac0fa24e9a30fb95b5e1e1e18c26c8fd737f904b564c:4 \
--source-chain avalanche \
--source-address 0x90AD61b0FaC683b23543Ed39B8E3Bd418D6CcBfe \
--destination-chain fantom \
--destination-address 0x9B35d37a8ebCb1d744ADdEC47CA2a939e811B638 \
--payload 00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000f68656c6c6f206176616c616e63686500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

where

- `id` -- the `<transactionHash>:<blockLogIndex>`. Note that you need the `blockLogIndex`, not the `txLogIndex`. For example, the [earlier transaction](https://testnet.snowtrace.io/tx/0x02293467b9d6e1ce51d8ac0fa24e9a30fb95b5e1e1e18c26c8fd737f904b564c) is included in [`block 31050074`](https://testnet.snowtrace.io/block/31050074?chainId=43113), and the `ContractCall` topic is `0x30ae6cc78c27e651745bf2ad08a11de83910ac1e347a52f7ac898c0fbef94dae`. Searching for this topic in the block’s logs, we see that the `logIndex` is `4` :

   ```bash
   $ curl -s --location $RPC \
   --header 'Content-Type: application/json' \
   --data '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{
      "fromBlock": "0x1d9c95a"
   }],"id":1}' | jq | grep 0x30ae6cc78c27e651745bf2ad08a11de83910ac1e347a52f7ac898c0fbef94dae -A 11 -B 3
      {
         "address": "0xca85f85c72df5f8428a440887ca7c449d94e0d0c",
         "topics": ["0x30ae6cc78c27e651745bf2ad08a11de83910ac1e347a52f7ac898c0fbef94dae", "0x00000000000000000000000090ad61b0fac683b23543ed39b8e3bd418d6ccbfe", "0xa9b070ad799e19f1166fdbf4524b684f8026df510fe6a7770f949ad54047098c"],
         ...
         "logIndex": "0x4", # <- our logIndex
         ...
      },
   ```
- `source-chain` -- the source chain
- `source-address` -- the address of the sender
- `destination-chain` -- the destination chain
- `destination-address` -- the address of the recipient
- `payload` -- the transaction payload of `ContractCall` event, in bytes. The `0x` can be omitted:

   ![Payload](/images/payload.png)

After a few seconds, the `verify` command will exit displaying the `id`, and or an error if any:

```bash
node amplifier verify --id 0x02293467b9d6e1ce51d8ac0fa24e9a30fb95b5e1e1e18c26c8fd737f904b564c:4 --source-chain avalanche --source-address 0x90AD61b0FaC683b23543Ed39B8E3Bd418D6CcBfe --destination-chain fantom --destination-address 0x9B35d37a8ebCb1d744ADdEC47CA2a939e811B638 --payload 00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000f68656c6c6f206176616c616e63686500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000  
Connecting to server at localhost:50051
Verifying message: {
  message: {
    id: '0x02293467b9d6e1ce51d8ac0fa24e9a30fb95b5e1e1e18c26c8fd737f904b564c:4',
    sourceChain: 'avalanche',
    sourceAddress: '0x90AD61b0FaC683b23543Ed39B8E3Bd418D6CcBfe',
    destinationChain: 'fantom',
    destinationAddress: '0x9B35d37a8ebCb1d744ADdEC47CA2a939e811B638',
    payload: <Buffer 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ... 110 more bytes>
  }
}
Success verification for 0x02293467b9d6e1ce51d8ac0fa24e9a30fb95b5e1e1e18c26c8fd737f904b564c:4
```

### `subscribe-to-approvals`

After a verification is initiated and once all internal processes (verifying, routing messages to the destination gateway, and constructing proof) are done on the Axelar network, a `signing-completed` event is emitted which contains a `session-id`. This `session-id` can be used to query the proof from the Axelar chain and return the execute data that need to be relayed on the destination chain. Do this by running `subscribe-to-approvals`:

```bash
node amplifer subscribe-to-approvals \
--chain fantom \
--start-height <start-height> # optional
```

- `chain` -- the destination chain
- `start-height` (optional) -- start height [0 = latest] similar to `subscribe-to-wasm-events`

For example:

```bash
$ node amplifier subscribe-to-approvals -c fantom -s 221645
Subscribing to approvals starting from block: 221645 on chain: fantom
Connecting to server at localhost:50051
chain: fantom
block height: 221855
execute data: 09c5eabe000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000006e00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000002e00000000000000000000000000000000000000000000000000000000000000fa2000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000010749a63dd8ad2d24037397e5adff4027176863d46a05e007749e3d9b2e1eadb3000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000013617070726f7665436f6e747261637443616c6c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000009b35d37a8ebcb1d744addec47ca2a939e811b638a9b070ad799e19f1166fdbf4524b684f8026df510fe6a7770f949ad54047098c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000096176616c616e6368650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a307839304144363162304661433638336232333534334564333942384533426434313844364363426665000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000380000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000030000000000000000000000008054f16ad10c3bf57e178f7f9bc45ea89f84301a00000000000000000000000089a73afebb411c865074251e036d4c12eb99b7ba000000000000000000000000f330a7f2a738eefd5cf1a33211cd131a7e92fdd400000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000417d7349a27e2a6e291f54a5954ec32eb7dcb6f5ec33fe71830dac34181d8af97b6d1d5f2d1309a0c56820cf95f6d4890444e35c8cdb749bf3f2d1c69393c1a2661b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041bd88d12035d8b2aededcf1444ecba29dd933087761e8ea1fd6c0d7efb0262542240539234dcf72c2ba748b9ece101c365fd498dfd565f646249771f56ade281f1c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041af4a7296bcb0b21282a7938c7a97ec1f82c2fe440e260e0dbe8aeecfaa5c77a902bc39a6dea0235860944a3085ff6e9a1c340865e9f93d82a8a4922d0c5253fb1b00000000000000000000000000000000000000000000000000000000000000
---
```

### `get-payload`

To get the payload that was submitted by the transaction on the source chain, use `get-payload`:

```bash
$ node amplifier get-payload --hash 0xa9b070ad799e19f1166fdbf4524b684f8026df510fe6a7770f949ad54047098c
Getting payload for payload hash a9b070ad799e19f1166fdbf4524b684f8026df510fe6a7770f949ad54047098c
Connecting to server at localhost:50051
Payload:
00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000f68656c6c6f206176616c616e63686500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

- `hash` -- the payload hash

![Payload hash](/images/payload-hash.png)